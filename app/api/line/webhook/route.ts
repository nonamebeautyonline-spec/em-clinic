import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";        // crypto 使用のため必須
export const dynamic = "force-dynamic"; // キャッシュ無効

// ===== 環境変数 =====
const LINE_NOTIFY_CHANNEL_SECRET = process.env.LINE_NOTIFY_CHANNEL_SECRET || "";
const LINE_ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID || "";
const GAS_REORDER_URL = process.env.GAS_REORDER_URL || "";

// ===== LINE署名検証（HMAC-SHA256 → Base64）=====
function verifyLineSignature(rawBody: string, signature: string) {
  if (!LINE_NOTIFY_CHANNEL_SECRET || !signature) return false;

  const hash = crypto
    .createHmac("sha256", LINE_NOTIFY_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");

  if (hash.length !== signature.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(signature)
  );
}

// ===== "a=b&c=d" → { a: b, c: d } =====
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
    // ===== 必須環境変数チェック =====
    if (!LINE_NOTIFY_CHANNEL_SECRET) {
      return NextResponse.json(
        { ok: false, error: "LINE_NOTIFY_CHANNEL_SECRET missing" },
        { status: 500 }
      );
    }
    if (!LINE_ADMIN_GROUP_ID) {
      return NextResponse.json(
        { ok: false, error: "LINE_ADMIN_GROUP_ID missing" },
        { status: 500 }
      );
    }
    if (!GAS_REORDER_URL) {
      return NextResponse.json(
        { ok: false, error: "GAS_REORDER_URL missing" },
        { status: 500 }
      );
    }

    // ===== 署名検証 =====
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature") || "";

    if (!verifyLineSignature(rawBody, signature)) {
      return NextResponse.json(
        { ok: false, error: "invalid signature" },
        { status: 401 }
      );
    }

    // ===== JSON parse =====
    const body = JSON.parse(rawBody);
    const events = Array.isArray(body?.events) ? body.events : [];

    // ===== イベント処理 =====
    for (const ev of events) {
      const groupId = ev?.source?.groupId;

      // 管理グループ以外は無視（安全柵）
      if (groupId !== LINE_ADMIN_GROUP_ID) continue;

      // ボタン押下（postback）
      if (ev?.type === "postback") {
        const q = parseQueryString(ev?.postback?.data || "");

        const action = q["reorder_action"]; // approve | reject
        const reorderId = q["reorder_id"]; // GAS行番号

        if (!action || !reorderId) continue;
        if (action !== "approve" && action !== "reject") continue;

        // ===== GASへ反映 =====
        const gasRes = await fetch(GAS_REORDER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, id: reorderId }),
          cache: "no-store",
        });

        const gasText = await gasRes.text();
        let gasJson: any = {};
        try {
          gasJson = JSON.parse(gasText);
        } catch {}

        if (!gasRes.ok || gasJson?.ok === false) {
          console.error("GAS reorder action failed", {
            action,
            reorderId,
            gasText,
          });
        }
      }
    }

    // LINEには常に200（再送防止）
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("LINE webhook fatal error", e);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
