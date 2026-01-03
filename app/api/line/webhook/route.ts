import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";          // crypto を使うので必須
export const dynamic = "force-dynamic";   // キャッシュさせない

const LINE_CHANNEL_SECRET = process.env.LINE_NOTIFY_CHANNEL_SECRET || "";
const LINE_ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID || "";
const GAS_REORDER_URL = process.env.GAS_REORDER_URL || "";

// LINE署名検証（HMAC-SHA256 → Base64）
function verifyLineSignature(rawBody: string, signature: string) {
  const hash = crypto
    .createHmac("sha256", LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");

  // timingSafeEqual は同じ長さでないと落ちるのでガード
  if (!hash || !signature) return false;
  if (hash.length !== signature.length) return false;

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// "a=b&c=d" をパース
function parseQueryString(data: string) {
  const out: Record<string, string> = {};
  for (const part of String(data || "").split("&")) {
    if (!part) continue;
    const [k, v] = part.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    if (!LINE_CHANNEL_SECRET) {
      return NextResponse.json({ ok: false, error: "LINE_CHANNEL_SECRET missing" }, { status: 500 });
    }
    if (!GAS_REORDER_URL) {
      return NextResponse.json({ ok: false, error: "GAS_REORDER_URL missing" }, { status: 500 });
    }

    // 生ボディで署名検証する必要がある
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature") || "";

    if (!verifyLineSignature(rawBody, signature)) {
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
        console.log("LINE WEBHOOK BODY ↓↓↓");
    console.log(JSON.stringify(body, null, 2));
    const events = Array.isArray(body?.events) ? body.events : [];

    for (const ev of events) {
      // 管理グループ以外は無視（安全柵）
      const groupId = ev?.source?.groupId;
      if (groupId) console.log("LINE groupId:", groupId);
      if (LINE_ADMIN_GROUP_ID && groupId !== LINE_ADMIN_GROUP_ID) continue;

      // ボタン押下（postback）
      if (ev?.type === "postback") {
        const dataStr: string = ev?.postback?.data || "";
        const q = parseQueryString(dataStr);

        const action = q["reorder_action"];    // approve / reject
        const reorderId = q["reorder_id"];     // 行番号（あなたのGAS実装）

        if (!action || !reorderId) continue;
        if (action !== "approve" && action !== "reject") continue;

        // GASへ承認/却下を反映
        const gasRes = await fetch(GAS_REORDER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, id: reorderId }),
          cache: "no-store",
        });

        const gasText = await gasRes.text();
        let gasJson: any = {};
        try { gasJson = JSON.parse(gasText); } catch {}

        if (!gasRes.ok || gasJson?.ok === false) {
          console.error("GAS reorder action failed", { action, reorderId, gasText });
        }
      }
    }

    // LINEには常に200を返す（再送を抑える）
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("LINE webhook error", e);
    return NextResponse.json({ ok: false, error: "unexpected error" }, { status: 500 });
  }
}
