// app/api/stripe/webhook/route.ts
// Stripe Webhook受信: 署名検証 + 冪等性チェック + イベント処理
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { checkIdempotency } from "@/lib/idempotency";
import { processStripeEvent } from "@/lib/webhook-handlers/stripe";
import { notifyWebhookFailure } from "@/lib/notifications/webhook-failure";
import { DEFAULT_TENANT_ID } from "@/lib/tenant";

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

  // テナント解決: Stripeは現状platform_settingsで管理されておりテナント分離未実施
  // 将来tenant_settingsに移行した際はresolveWebhookTenantで逆引きする
  const tenantId = DEFAULT_TENANT_ID;

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
