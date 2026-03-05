// app/api/cron/report-usage/route.ts
// 月次使用量Stripe報告: monthly_usageからメッセージ数集計 → Stripe Usage Record作成

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStripeClient } from "@/lib/stripe";
import { acquireLock } from "@/lib/distributed-lock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron 認証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 排他制御
  const lock = await acquireLock("cron:report-usage", 300);
  if (!lock.acquired) {
    return NextResponse.json({
      ok: true,
      message: "別のインスタンスが実行中です",
      skipped: true,
    });
  }

  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      return NextResponse.json({
        ok: true,
        message: "Stripe未設定のためスキップ",
        skipped: true,
      });
    }

    // 未報告の月次使用量レコードを取得
    const { data: usageRecords, error: fetchErr } = await supabaseAdmin
      .from("monthly_usage")
      .select("id, tenant_id, year_month, message_count")
      .eq("reported_to_stripe", false);

    if (fetchErr) {
      console.error("[report-usage] 使用量取得エラー:", fetchErr);
      return NextResponse.json({ ok: false, error: "使用量データ取得失敗" }, { status: 500 });
    }

    if (!usageRecords || usageRecords.length === 0) {
      await lock.release();
      return NextResponse.json({ ok: true, message: "報告対象なし", reported: 0 });
    }

    let reported = 0;
    let failed = 0;

    for (const record of usageRecords) {
      try {
        // テナントのStripe情報を取得
        const { data: tenantPlan } = await supabaseAdmin
          .from("tenant_plans")
          .select("stripe_customer_id, stripe_subscription_id")
          .eq("tenant_id", record.tenant_id)
          .single();

        if (!tenantPlan?.stripe_customer_id || !tenantPlan?.stripe_subscription_id) {
          // Stripeサブスクなし → スキップ（報告済みにはしない）
          continue;
        }

        // Billing Meter Eventsで使用量報告（Stripe v20+）
        await stripe.billing.meterEvents.create({
          event_name: "message_sent",
          payload: {
            stripe_customer_id: tenantPlan.stripe_customer_id,
            value: String(record.message_count || 0),
          },
          timestamp: Math.floor(Date.now() / 1000),
        });

        // 報告済みフラグ更新
        await supabaseAdmin
          .from("monthly_usage")
          .update({ reported_to_stripe: true })
          .eq("id", record.id);

        reported++;
      } catch (err) {
        console.error(`[report-usage] テナント ${record.tenant_id} 報告エラー:`, err);
        failed++;
      }
    }

    await lock.release();

    return NextResponse.json({
      ok: true,
      reported,
      failed,
      total: usageRecords.length,
    });
  } catch (err) {
    console.error("[report-usage] 予期しないエラー:", err);
    await lock.release();
    return NextResponse.json({ ok: false, error: "予期しないエラー" }, { status: 500 });
  }
}
