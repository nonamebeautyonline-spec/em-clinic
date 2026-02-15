// app/api/doctor/reorders/approve/route.ts
// DB-first: 承認処理
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { pushMessage } from "@/lib/line-push";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = body.id as string | number | undefined;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id required" },
        { status: 400 }
      );
    }

    const gasRowNumber = Number(id);

    // ★ DB-first: まずDBを更新
    const { data: reorderData, error: selectError } = await supabaseAdmin
      .from("reorders")
      .select("id, patient_id, status")
      .eq("gas_row_number", gasRowNumber)
      .single();

    if (selectError || !reorderData) {
      console.error("[doctor/reorders/approve] Reorder not found:", gasRowNumber);
      return NextResponse.json(
        { ok: false, error: "reorder_not_found" },
        { status: 404 }
      );
    }

    if (reorderData.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: `invalid_status: ${reorderData.status}` },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("reorders")
      .update({
        status: "confirmed",
        approved_at: new Date().toISOString(),
      })
      .eq("gas_row_number", gasRowNumber);

    if (updateError) {
      console.error("[doctor/reorders/approve] DB update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      );
    }

    console.log(`[doctor/reorders/approve] DB update success, gas_row=${gasRowNumber}`);

    // ★ キャッシュ削除
    if (reorderData.patient_id) {
      await invalidateDashboardCache(reorderData.patient_id);
      console.log(`[doctor/reorders/approve] Cache invalidated for patient ${reorderData.patient_id}`);
    }

    // 患者へLINE通知
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
          if (pushRes?.ok) {
            await supabaseAdmin.from("message_log").insert({
              patient_id: reorderData.patient_id,
              line_uid: intake.line_id,
              direction: "outgoing",
              event_type: "message",
              message_type: "text",
              content: "再処方申請が承認されました🌸\nマイページより決済のお手続きをお願いいたします。\n何かご不明な点がございましたら、お気軽にお知らせください🫧",
              status: "sent",
            });
          }
        } catch (err) {
          lineNotify = "failed";
          console.error("[doctor/approve] Patient push error:", err);
        }
      }

      await supabaseAdmin
        .from("reorders")
        .update({ line_notify_result: lineNotify })
        .eq("gas_row_number", gasRowNumber);
    }

    return NextResponse.json({ ok: true, lineNotify }, { status: 200 });
  } catch (e) {
    console.error("POST /api/doctor/reorders/approve error", e);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
