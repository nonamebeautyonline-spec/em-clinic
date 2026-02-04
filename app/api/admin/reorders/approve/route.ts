// DB-only: 再処方承認（GAS不要）+ LINE通知
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const LINE_NOTIFY_CHANNEL_ACCESS_TOKEN = process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";
const LINE_ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID || "";

async function pushToGroup(text: string) {
  if (!LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || !LINE_ADMIN_GROUP_ID) return;
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_NOTIFY_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_ADMIN_GROUP_ID,
        messages: [{ type: "text", text }],
      }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[admin/approve] LINE push error:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body; // id = gas_row_number

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // まずpatient_idとstatusを取得
    const { data: reorderData, error: fetchError } = await supabaseAdmin
      .from("reorders")
      .select("id, patient_id, status")
      .eq("gas_row_number", Number(id))
      .single();

    if (fetchError || !reorderData) {
      console.error("[admin/reorders/approve] Reorder not found:", id);
      return NextResponse.json({ error: "Reorder not found" }, { status: 404 });
    }

    // 重複チェック: 既に処理済みならスキップ
    if (reorderData.status !== "pending") {
      console.log(`[admin/reorders/approve] Already processed: ${reorderData.status}`);
      return NextResponse.json({
        ok: true,
        message: `既に処理済みです (${reorderData.status})`
      });
    }

    // ステータス更新
    const { error: dbError } = await supabaseAdmin
      .from("reorders")
      .update({
        status: "confirmed",
        approved_at: new Date().toISOString(),
      })
      .eq("gas_row_number", Number(id));

    if (dbError) {
      console.error("[admin/reorders/approve] DB update error:", dbError);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    console.log(`[admin/reorders/approve] Approved: gas_row=${id}, patient=${reorderData.patient_id}`);

    // キャッシュ削除
    if (reorderData.patient_id) {
      await invalidateDashboardCache(reorderData.patient_id);
    }

    // LINE通知（管理画面から承認）
    pushToGroup(`【再処方】承認しました（管理画面）\n申請ID: ${id}`).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
