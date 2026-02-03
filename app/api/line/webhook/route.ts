import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ===== 環境変数 =====
const LINE_NOTIFY_CHANNEL_SECRET = process.env.LINE_NOTIFY_CHANNEL_SECRET || "";
const LINE_ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID || "";
const GAS_REORDER_URL = process.env.GAS_REORDER_URL || "";
const LINE_NOTIFY_CHANNEL_ACCESS_TOKEN =
  process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";

// ===== LINE署名検証（HMAC-SHA256 → Base64）=====
function verifyLineSignature(rawBody: string, signature: string) {
  if (!LINE_NOTIFY_CHANNEL_SECRET || !signature) return false;

  const hash = crypto
    .createHmac("sha256", LINE_NOTIFY_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");

  if (hash.length !== signature.length) return false;

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
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

// ===== グループへ結果通知（push）=====
// ※送信先は「押したグループ（groupId）」を使う：これが最も確実
async function pushToGroup_(toGroupId: string, text: string) {
  if (!LINE_NOTIFY_CHANNEL_ACCESS_TOKEN) {
    console.error("[pushToGroup] missing LINE_NOTIFY_CHANNEL_ACCESS_TOKEN");
    return;
  }
  if (!toGroupId) {
    console.error("[pushToGroup] missing toGroupId");
    return;
  }

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_NOTIFY_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: toGroupId,
      messages: [{ type: "text", text }],
    }),
    cache: "no-store",
  });

  const body = await res.text();
  console.log("[pushToGroup] status=", res.status, "body=", body);

  if (!res.ok) {
    console.error("[pushToGroup] failed", { status: res.status, body });
  }
}

export async function POST(req: NextRequest) {
  try {
    // ===== 必須 env チェック =====
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
      const groupId: string = ev?.source?.groupId || "";

      // 管理グループ以外は無視（安全柵）
      if (groupId !== LINE_ADMIN_GROUP_ID) continue;

      // ボタン押下（postback）
      if (ev?.type === "postback") {
        const dataStr: string = ev?.postback?.data || "";
        console.log("[postback] data=", dataStr);

        const q = parseQueryString(dataStr);
        const action = q["reorder_action"]; // approve | reject
        const reorderId = q["reorder_id"]; // GAS行番号

        console.log("[postback] parsed=", { action, reorderId });

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
          console.error("[GAS] reorder action failed", {
            action,
            reorderId,
            gasText,
          });

          // 失敗時通知（押したグループへ返す）
          await pushToGroup_(
            groupId,
            `【再処方】${action === "approve" ? "承認" : "却下"} 失敗\n申請ID: ${reorderId}\n原因: ${String(gasJson?.error || gasText || "").slice(0, 200)}`
          );
        } else {
          // ★ Supabaseも更新（gas_row_numberでマッチング）
          try {
            const reorderIdNum = Number(reorderId);
            if (Number.isFinite(reorderIdNum)) {
              const { error: dbError } = await supabaseAdmin
                .from("reorders")
                .update({
                  status: action === "approve" ? "approved" : "rejected",
                  ...(action === "approve"
                    ? { approved_at: new Date().toISOString() }
                    : { rejected_at: new Date().toISOString() }),
                })
                .eq("gas_row_number", reorderIdNum);

              if (dbError) {
                console.error("[LINE webhook] Supabase reorder update error:", dbError);
              } else {
                console.log(`[LINE webhook] Supabase reorder ${action} success for row ${reorderId}`);
              }
            }
          } catch (dbErr) {
            console.error("[LINE webhook] Supabase exception:", dbErr);
          }

          // 成功時通知（押したグループへ返す）
          await pushToGroup_(
            groupId,
            `【再処方】${action === "approve" ? "承認しました" : "却下しました"}\n申請ID: ${reorderId}`
          );
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
