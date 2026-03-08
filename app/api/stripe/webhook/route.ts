// app/api/stripe/webhook/route.ts
// Stripe Webhook受信: 署名検証 + 冪等性チェック + イベント処理
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { checkIdempotency } from "@/lib/idempotency";
import { processStripeEvent } from "@/lib/webhook-handlers/stripe";

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

  // 冪等性チェック
  const idem = await checkIdempotency("stripe", event.id, null, {
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
    return NextResponse.json({ error: "処理エラー" }, { status: 500 });
  }
}
