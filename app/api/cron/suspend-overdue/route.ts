// app/api/cron/suspend-overdue/route.ts
// 支払い滞納テナントの自動サスペンド
// 猶予期間（14日）を超えた payment_failed テナントを is_active=false に

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { acquireLock } from "@/lib/distributed-lock";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";

export const dynamic = "force-dynamic";

/** 猶予日数: 支払い失敗から何日後にサスペンドするか */
const GRACE_PERIOD_DAYS = 14;

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return unauthorized("Cron認証に失敗しました");
  }

  const lock = await acquireLock("cron:suspend-overdue", 120);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: true, message: "別のインスタンスが実行中" });
  }

  try {
    // 猶予期間を超過した payment_failed テナントを取得
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - GRACE_PERIOD_DAYS);

    const { data: overduePlans, error: queryErr } = await supabaseAdmin
      .from("tenant_plans")
      .select("tenant_id, payment_failed_at")
      .eq("status", "payment_failed")
      .not("payment_failed_at", "is", null)
      .lt("payment_failed_at", cutoffDate.toISOString());

    if (queryErr) {
      console.error("[suspend-overdue] クエリエラー:", queryErr);
      await lock.release();
      return serverError("データ取得に失敗しました");
    }

    if (!overduePlans || overduePlans.length === 0) {
      await lock.release();
      return NextResponse.json({ ok: true, suspended: 0, message: "対象テナントなし" });
    }

    let suspended = 0;
    let alreadySuspended = 0;
    const errors: string[] = [];

    for (const plan of overduePlans) {
      try {
        // 既にサスペンド済みかチェック
        const { data: tenant } = await supabaseAdmin
          .from("tenants")
          .select("id, name, is_active")
          .eq("id", plan.tenant_id)
          .single();

        if (!tenant) continue;

        if (!tenant.is_active) {
          alreadySuspended++;
          continue;
        }

        // テナントをサスペンド
        const now = new Date().toISOString();
        await supabaseAdmin
          .from("tenants")
          .update({
            is_active: false,
            suspended_at: now,
            suspend_reason: "payment_overdue",
            updated_at: now,
          })
          .eq("id", plan.tenant_id);

        // プランステータスも suspended に更新
        await supabaseAdmin
          .from("tenant_plans")
          .update({
            status: "suspended",
            updated_at: now,
          })
          .eq("tenant_id", plan.tenant_id);

        console.log(
          `[suspend-overdue] テナント「${tenant.name}」(${tenant.id})をサスペンド: 支払い失敗日=${plan.payment_failed_at}`,
        );
        suspended++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${plan.tenant_id}: ${msg}`);
        console.error(`[suspend-overdue] テナント ${plan.tenant_id} のサスペンド失敗:`, err);
      }
    }

    await lock.release();

    const result = {
      ok: true,
      suspended,
      alreadySuspended,
      errors: errors.length,
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
    console.log("[suspend-overdue] 完了:", JSON.stringify(result));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[suspend-overdue] 予期しないエラー:", err);
    notifyCronFailure("suspend-overdue", err).catch(() => {});
    await lock.release();
    return serverError("予期しないエラーが発生しました");
  }
}
