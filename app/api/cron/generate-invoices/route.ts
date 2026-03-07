// app/api/cron/generate-invoices/route.ts
// 月次超過料金請求書生成Cron: 毎月1日 18:00 UTC（翌月1日 03:00 JST）に実行
// 前月分の超過料金を全アクティブテナントに対してStripe請求書として発行する
// テナント横断処理: tenant_id ごとにループして generateOverageInvoice を呼び出す

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { acquireLock } from "@/lib/distributed-lock";
import { serverError, unauthorized } from "@/lib/api-error";
import { generateOverageInvoice, type InvoiceResult } from "@/lib/generate-invoice";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron 認証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return unauthorized("Cron認証に失敗しました");
  }

  // Redis分散ロック（TTL 10分）
  const lock = await acquireLock("cron:generate-invoices", 600);
  if (!lock.acquired) {
    return NextResponse.json({
      ok: true,
      message: "別のインスタンスが実行中です",
      skipped: true,
    });
  }

  try {
    // 全アクティブテナントを取得
    const { data: tenants, error: tenantsErr } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("is_active", true);

    if (tenantsErr || !tenants) {
      console.error("[generate-invoices] テナント取得エラー:", tenantsErr);
      await lock.release();
      return serverError("テナント取得に失敗しました");
    }

    // 前月の日付を計算
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 全テナントを並列で処理
    const settled = await Promise.allSettled(
      tenants.map(async (tenant) => {
        try {
          return await generateOverageInvoice(tenant.id, lastMonth);
        } catch (err) {
          console.error(
            `[generate-invoices] テナント ${tenant.id} の処理でエラー:`,
            err,
          );
          return {
            status: "error" as const,
            tenantId: tenant.id,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      })
    );

    const results: InvoiceResult[] = settled.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { status: "error" as const, tenantId: "", error: String(r.reason) }
    );

    await lock.release();

    // 結果サマリーを集計
    const summary = {
      total: results.length,
      generated: results.filter((r) => r.status === "generated").length,
      skipped_no_overage: results.filter((r) => r.status === "skipped_no_overage").length,
      skipped_already_generated: results.filter((r) => r.status === "skipped_already_generated").length,
      skipped_no_stripe: results.filter((r) => r.status === "skipped_no_stripe").length,
      skipped_no_customer: results.filter((r) => r.status === "skipped_no_customer").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    console.log("[generate-invoices] 完了:", JSON.stringify(summary));

    return NextResponse.json({
      ok: true,
      month: `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`,
      ...summary,
      errorDetails: results
        .filter((r) => r.status === "error")
        .map((r) => ({ tenantId: r.tenantId, error: r.error })),
    });
  } catch (err) {
    console.error("[generate-invoices] 予期しないエラー:", err);
    notifyCronFailure("generate-invoices", err).catch(() => {});
    await lock.release();
    return serverError("予期しないエラーが発生しました");
  }
}
