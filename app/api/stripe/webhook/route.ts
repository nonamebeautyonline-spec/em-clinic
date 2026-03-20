// app/api/stripe/webhook/route.ts
// Stripe Webhook受信: 署名検証 + 冪等性チェック + イベント処理
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { checkIdempotency } from "@/lib/idempotency";
import { processStripeEvent } from "@/lib/webhook-handlers/stripe";
import { notifyWebhookFailure } from "@/lib/notifications/webhook-failure";
import { resolveTenantId } from "@/lib/tenant";
import { resolveWebhookTenant } from "@/lib/webhook-tenant-resolver";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "署名がありません" }, { status: 400 });
  }

  const event = await verifyWebhookSignature(body, signature);
  if (!event) {
    return NextResponse.json({ error: "署名検証失敗" }, { status: 400 });
  }

  // テナント解決: ヘッダー → tenant_settings逆引き → 失敗時は記録して終了
  // Stripeはpaymentカテゴリで管理（将来tenant_settingsに移行予定）
  let tenantId = resolveTenantId(req);
  if (!tenantId) {
    tenantId = await resolveWebhookTenant("payment", "stripe_webhook_secret", signature);
  }
  if (!tenantId) {
    console.error("[stripe/webhook] テナントID解決失敗 — イベントを記録して終了");
    try {
      await supabaseAdmin.from("webhook_events").insert({
        event_source: "stripe",
        event_id: `stripe_unresolved_${Date.now()}`,
        status: "failed",
        payload: { event_type: event.type, event_id: event.id },
      });
    } catch (e) {
      console.error("[stripe/webhook] 失敗記録エラー:", e);
    }
    return NextResponse.json({ received: true });
  }

  // 冪等性チェック
  const idem = await checkIdempotency("stripe", event.id, tenantId, {
    type: event.type,
    data: event.data?.object,
  });
  if (idem.duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    // 業務ロジック（リプレイ可能なハンドラに委譲）
    await processStripeEvent(event);
    await idem.markCompleted();
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[stripe-webhook] イベント処理エラー (${event.type}):`, err);
    await idem.markFailed(err instanceof Error ? err.message : "unknown error");
    notifyWebhookFailure("stripe", event.id, err, tenantId).catch(() => {});
    return NextResponse.json({ error: "処理エラー" }, { status: 500 });
  }
}
