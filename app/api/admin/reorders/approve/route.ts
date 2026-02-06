// DB-only: 再処方承認（GAS不要）+ LINE通知（管理者グループ＆患者個別）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";

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
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
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

    // LINE通知（管理者グループ）
    pushToGroup(`【再処方】承認しました（管理画面）\n申請ID: ${id}`).catch(() => {});

    // LINE通知（患者へ承認通知）
    let lineNotify: "sent" | "no_uid" | "failed" = "no_uid";

    if (reorderData.patient_id) {
      const { data: intake } = await supabaseAdmin
        .from("intake")
        .select("line_id")
        .eq("patient_id", reorderData.patient_id)
        .not("line_id", "is", null)
        .limit(1)
        .single();

      if (intake?.line_id) {
        try {
          const pushRes = await pushMessage(intake.line_id, [{
            type: "text",
            text: "再処方申請が承認されました🌸\nマイページより決済のお手続きをお願いいたします。\n何かご不明な点がございましたら、お気軽にお知らせください🫧",
          }]);
          lineNotify = pushRes?.ok ? "sent" : "failed";
          if (!pushRes?.ok) {
            console.error(`[admin/approve] LINE push failed: ${pushRes?.status}`);
          }
        } catch (err) {
          lineNotify = "failed";
          console.error("[admin/approve] Patient LINE push error:", err);
        }
      } else {
        console.log(`[admin/approve] No LINE UID for patient ${reorderData.patient_id}, skipping push`);
      }
    }

    // LINE通知結果をDBに保存
    await supabaseAdmin
      .from("reorders")
      .update({ line_notify_result: lineNotify })
      .eq("gas_row_number", Number(id));

    return NextResponse.json({ ok: true, lineNotify });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
