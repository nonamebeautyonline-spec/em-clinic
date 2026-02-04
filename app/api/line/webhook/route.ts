import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";

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

// ===== バックグラウンドでGAS同期 =====
async function syncToGas(action: string, id: number) {
  if (!GAS_REORDER_URL) return;
  try {
    await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
      cache: "no-store",
    });
    console.log(`[LINE webhook] GAS sync done: ${action} id=${id}`);
  } catch (err) {
    console.error(`[LINE webhook] GAS sync error:`, err);
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
        const reorderId = q["reorder_id"]; // gas_row_number

        console.log("[postback] parsed=", { action, reorderId });

        if (!action || !reorderId) continue;
        if (action !== "approve" && action !== "reject") continue;

        const gasRowNumber = Number(reorderId);
        if (!Number.isFinite(gasRowNumber)) continue;

        // ★ DB-first: まずDBを更新
        const { data: reorderData, error: selectError } = await supabaseAdmin
          .from("reorders")
          .select("id, patient_id, status")
          .eq("gas_row_number", gasRowNumber)
          .single();

        if (selectError || !reorderData) {
          console.error("[LINE webhook] Reorder not found:", gasRowNumber);
          await pushToGroup_(
            groupId,
            `【再処方】${action === "approve" ? "承認" : "却下"} 失敗\n申請ID: ${reorderId}\n原因: DBにレコードが見つかりません`
          );
          continue;
        }

        if (reorderData.status !== "pending") {
          console.log(`[LINE webhook] Reorder already processed: ${reorderData.status}`);
          await pushToGroup_(
            groupId,
            `【再処方】この申請は既に処理済みです (${reorderData.status})\n申請ID: ${reorderId}`
          );
          continue;
        }

        const { error: updateError } = await supabaseAdmin
          .from("reorders")
          .update({
            status: action === "approve" ? "confirmed" : "rejected",
            ...(action === "approve"
              ? { approved_at: new Date().toISOString() }
              : { rejected_at: new Date().toISOString() }),
          })
          .eq("gas_row_number", gasRowNumber);

        if (updateError) {
          console.error("[LINE webhook] DB update error:", updateError);
          await pushToGroup_(
            groupId,
            `【再処方】${action === "approve" ? "承認" : "却下"} 失敗\n申請ID: ${reorderId}\n原因: DB更新エラー`
          );
          continue;
        }

        console.log(`[LINE webhook] DB update success: ${action} gas_row=${gasRowNumber}`);

        // ★ キャッシュ削除
        if (reorderData.patient_id) {
          await invalidateDashboardCache(reorderData.patient_id);
          console.log(`[LINE webhook] Cache invalidated for patient ${reorderData.patient_id}`);
        }

        // ★ バックグラウンドでGAS同期（レスポンスを待たない）
        syncToGas(action, gasRowNumber).catch(() => {});

        // 成功時通知
        await pushToGroup_(
          groupId,
          `【再処方】${action === "approve" ? "承認しました" : "却下しました"}\n申請ID: ${reorderId}`
        );
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
