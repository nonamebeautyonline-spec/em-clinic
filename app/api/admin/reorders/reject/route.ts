// DB-only: 再処方却下（GAS不要）+ LINE通知
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

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
    console.error("[admin/reject] LINE push error:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const body = await req.json();
    const { id } = body; // id = reorder_number

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // まずpatient_idとstatusを取得
    const { data: reorderData, error: fetchError } = await withTenant(
      supabaseAdmin
        .from("reorders")
        .select("id, patient_id, status")
        .eq("reorder_number", Number(id)),
      tenantId
    ).single();

    if (fetchError || !reorderData) {
      console.error("[admin/reorders/reject] Reorder not found:", id);
      return NextResponse.json({ error: "Reorder not found" }, { status: 404 });
    }

    // 重複チェック: 既に処理済みならスキップ
    if (reorderData.status !== "pending") {
      console.log(`[admin/reorders/reject] Already processed: ${reorderData.status}`);
      return NextResponse.json({
        ok: true,
        message: `既に処理済みです (${reorderData.status})`
      });
    }

    // ステータス更新
    const { error: dbError } = await withTenant(
      supabaseAdmin
        .from("reorders")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
        })
        .eq("reorder_number", Number(id)),
      tenantId
    );

    if (dbError) {
      console.error("[admin/reorders/reject] DB update error:", dbError);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    console.log(`[admin/reorders/reject] Rejected: reorder_num=${id}, patient=${reorderData.patient_id}`);

    // キャッシュ削除
    if (reorderData.patient_id) {
      await invalidateDashboardCache(reorderData.patient_id);
    }

    // LINE通知（管理画面から却下）
    pushToGroup(`【再処方】却下しました（管理画面）\n申請ID: ${id}`).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
