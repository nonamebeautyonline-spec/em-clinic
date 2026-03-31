// app/api/webhooks/incoming/[id]/receive/route.ts — 外部Webhook受信エンドポイント
//
// 外部システム（Zapier, Google Forms, Stripe等）からPOSTを受信し、
// イベントバスに incoming_webhook イベントとして発火する。
// 認証不要（公開エンドポイント）。HMAC署名検証オプション付き。

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Webhook定義を取得
  const { data: webhook } = await supabaseAdmin
    .from("incoming_webhooks")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found or inactive" }, { status: 404 });
  }

  // HMAC署名検証（secretが設定されている場合）
  if (webhook.secret) {
    const signature = req.headers.get("x-webhook-signature") || req.headers.get("x-hub-signature-256") || "";
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const bodyText = await req.clone().text();
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhook.secret as string),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // sha256=xxx 形式にも対応
    const receivedHex = signature.replace(/^sha256=/, "");
    if (receivedHex !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // ペイロード取得
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // イベントバス発火（fire-and-forget）
  const tenantId = webhook.tenant_id as string;
  const sourceType = webhook.source_type as string;

  import("@/lib/event-bus").then(({ fireEvent }) =>
    fireEvent("incoming_webhook", {
      tenantId,
      eventData: {
        webhookId: id,
        source: sourceType,
        payload: body,
      },
    }).catch((e) => console.error("[incoming-webhook] fireEvent error:", e)),
  );

  return NextResponse.json({
    ok: true,
    received: true,
    source: sourceType,
  });
}
