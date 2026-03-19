// app/api/cron/ehr-sync/route.ts — EHR同期スケジュール実行（Cron）
// テナントごとの同期スケジュール設定に基づき、外部カルテとの同期を実行する

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { acquireLock } from "@/lib/distributed-lock";
import { getSetting } from "@/lib/settings";
import { withTenant } from "@/lib/tenant";
import { createAdapter, pushPatient, pullPatient, pushKarte, pullKarte } from "@/lib/ehr/sync";
import type { SyncResult } from "@/lib/ehr/types";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";

/** 同期間隔の種類 */
type SyncInterval = "hourly" | "every6h" | "daily";

/** 同期スケジュール設定 */
interface SyncScheduleConfig {
  interval: SyncInterval;
  enabled: boolean;
  sync_time: string; // HH:mm（daily用）
}

/** デフォルト設定 */
const DEFAULT_SCHEDULE: SyncScheduleConfig = {
  interval: "daily",
  enabled: false,
  sync_time: "03:00",
};

/**
 * 現在の時刻がテナントの同期タイミングかどうかを判定
 */
function shouldSyncNow(schedule: SyncScheduleConfig): boolean {
  if (!schedule.enabled) return false;

  const now = new Date();
  const currentHour = now.getUTCHours() + 9; // JST変換
  const jstHour = ((currentHour % 24) + 24) % 24;

  switch (schedule.interval) {
    case "hourly":
      // 毎時実行
      return true;

    case "every6h":
      // 6時間ごと（0, 6, 12, 18時）
      return jstHour % 6 === 0;

    case "daily": {
      // 指定時刻に実行
      const [targetHour] = (schedule.sync_time || "03:00").split(":").map(Number);
      return jstHour === targetHour;
    }

    default:
      return false;
  }
}

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 排他制御: 同時実行を防止
  const lock = await acquireLock("cron:ehr-sync", 300);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    // 全テナントの同期スケジュール設定を取得
    const { data: tenantSettings } = await supabaseAdmin
      .from("tenant_settings")
      .select("tenant_id, value")
      .eq("category", "ehr")
      .eq("key", "sync_schedule");

    if (!tenantSettings?.length) {
      return NextResponse.json({ ok: true, processed: 0, message: "同期スケジュール設定なし" });
    }

    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalError = 0;
    const tenantResults: { tenantId: string | null; success: number; error: number; skipped: number }[] = [];

    for (const setting of tenantSettings) {
      const tenantId = setting.tenant_id;

      // 設定をパース
      let schedule: SyncScheduleConfig;
      try {
        schedule = typeof setting.value === "string"
          ? JSON.parse(setting.value)
          : setting.value;
      } catch {
        schedule = DEFAULT_SCHEDULE;
      }

      // 同期タイミングの判定
      if (!shouldSyncNow(schedule)) {
        continue;
      }

      // アダプター生成
      const adapter = await createAdapter(tenantId ?? undefined);
      if (!adapter) {
        console.warn(`[ehr-sync] テナント ${tenantId}: EHRプロバイダー未設定`);
        continue;
      }

      // 同期方向を設定から取得
      const syncDirection = await getSetting("ehr", "syncDirection", tenantId ?? undefined);

      // マッピング済み患者を取得（テナントフィルタ適用）
      const mappingQuery = supabaseAdmin
        .from("ehr_patient_mappings")
        .select("patient_id, external_id");
      const { data: mappings } = await withTenant(mappingQuery, tenantId);

      let success = 0;
      let error = 0;
      let skipped = 0;

      if (mappings?.length) {
        for (const mapping of mappings) {
          const results: SyncResult[] = [];

          try {
            // プッシュ（Lオペ→外部カルテ）
            if (!syncDirection || syncDirection === "bidirectional" || syncDirection === "lope_to_ehr") {
              results.push(await pushPatient(mapping.patient_id, adapter, tenantId ?? undefined));
              results.push(await pushKarte(mapping.patient_id, adapter, tenantId ?? undefined));
            }

            // プル（外部カルテ→Lオペ）
            if (!syncDirection || syncDirection === "bidirectional" || syncDirection === "ehr_to_lope") {
              results.push(await pullPatient(mapping.external_id, adapter, tenantId ?? undefined));
              results.push(await pullKarte(mapping.patient_id, adapter, tenantId ?? undefined));
            }

            for (const r of results) {
              if (r.status === "success") success++;
              else if (r.status === "error") error++;
              else skipped++;
            }
          } catch (e) {
            console.error(`[ehr-sync] テナント ${tenantId}, 患者 ${mapping.patient_id}:`, e);
            error++;
          }
        }
      }

      totalProcessed += (mappings?.length || 0);
      totalSuccess += success;
      totalError += error;

      tenantResults.push({
        tenantId,
        success,
        error,
        skipped,
      });
    }

    console.log(`[ehr-sync] 完了: テナント ${tenantResults.length}件, 成功 ${totalSuccess}, エラー ${totalError}`);

    return NextResponse.json({
      ok: true,
      processed: totalProcessed,
      tenants: tenantResults.length,
      success: totalSuccess,
      error: totalError,
    });
  } catch (e) {
    console.error("[ehr-sync] エラー:", e);
    notifyCronFailure("ehr-sync", e).catch(() => {});
    return serverError(e instanceof Error ? e.message : "EHR同期中にエラーが発生しました");
  } finally {
    await lock.release();
  }
}
