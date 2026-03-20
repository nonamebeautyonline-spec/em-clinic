// app/api/admin/ehr/sync-schedule/route.ts — EHR同期スケジュール設定API
// GET: 現在の同期スケジュール設定を取得
// PUT: 同期スケジュール設定を更新

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getSetting, setSetting } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

/** 同期間隔の種類 */
const VALID_INTERVALS = ["hourly", "every6h", "daily"] as const;
type SyncInterval = (typeof VALID_INTERVALS)[number];

/** 同期スケジュール設定 */
interface SyncScheduleConfig {
  interval: SyncInterval;
  enabled: boolean;
  sync_time: string; // HH:mm
}

/** デフォルト設定 */
const DEFAULT_SCHEDULE: SyncScheduleConfig = {
  interval: "daily",
  enabled: false,
  sync_time: "03:00",
};

/**
 * GET: 現在の同期スケジュール設定を取得
 */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const raw = await getSetting("ehr", "sync_schedule", tenantId ?? undefined);

    let schedule: SyncScheduleConfig = DEFAULT_SCHEDULE;
    if (raw) {
      try {
        schedule = JSON.parse(raw);
      } catch {
        // パース失敗時はデフォルトを返す
      }
    }

    return NextResponse.json({ ok: true, schedule });
  } catch (e) {
    console.error("[ehr-sync-schedule] GET エラー:", e);
    return serverError("同期スケジュール設定の取得に失敗しました");
  }
}

/**
 * PUT: 同期スケジュール設定を更新
 */
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const body = await req.json();

    // バリデーション
    const errors: string[] = [];

    if (body.interval !== undefined && !VALID_INTERVALS.includes(body.interval)) {
      errors.push(`interval は ${VALID_INTERVALS.join(", ")} のいずれかを指定してください`);
    }

    if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
      errors.push("enabled は true または false を指定してください");
    }

    if (body.sync_time !== undefined) {
      const timePattern = /^\d{2}:\d{2}$/;
      if (!timePattern.test(body.sync_time)) {
        errors.push("sync_time は HH:mm 形式で指定してください");
      } else {
        const [h, m] = body.sync_time.split(":").map(Number);
        if (h < 0 || h > 23 || m < 0 || m > 59) {
          errors.push("sync_time の値が範囲外です");
        }
      }
    }

    if (errors.length > 0) {
      return badRequest(errors.join("; "));
    }

    // 既存設定を取得してマージ
    const raw = await getSetting("ehr", "sync_schedule", tenantId ?? undefined);
    let current: SyncScheduleConfig = DEFAULT_SCHEDULE;
    if (raw) {
      try {
        current = JSON.parse(raw);
      } catch {
        // パース失敗時はデフォルトをベースにする
      }
    }

    const updated: SyncScheduleConfig = {
      interval: body.interval ?? current.interval,
      enabled: body.enabled ?? current.enabled,
      sync_time: body.sync_time ?? current.sync_time,
    };

    const success = await setSetting(
      "ehr",
      "sync_schedule",
      JSON.stringify(updated),
      tenantId ?? undefined,
    );

    if (!success) {
      return serverError("同期スケジュール設定の保存に失敗しました");
    }

    logAudit(req, "ehr_schedule.update", "ehr", "settings");
    return NextResponse.json({ ok: true, schedule: updated });
  } catch (e) {
    console.error("[ehr-sync-schedule] PUT エラー:", e);
    return serverError("同期スケジュール設定の更新に失敗しました");
  }
}
