import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const LINE_ACCESS_TOKEN =
  process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN ||
  process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";

// 患者のLINEブロック状態を確認し、未記録ならmessage_logに記録
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patient_id");
    if (!patientId) return NextResponse.json({ error: "patient_id required" }, { status: 400 });

    // patient_idからline_idを取得（複数レコード対応: 最新を優先）
    const { data: patients } = await supabaseAdmin
      .from("intake")
      .select("line_id")
      .eq("patient_id", patientId)
      .not("line_id", "is", null)
      .order("id", { ascending: false })
      .limit(1);

    // intakeにない場合はanswerersからフォールバック
    let lineId = patients?.[0]?.line_id;
    if (!lineId) {
      const { data: answerer } = await supabaseAdmin
        .from("answerers")
        .select("line_id")
        .eq("patient_id", patientId)
        .not("line_id", "is", null)
        .limit(1)
        .maybeSingle();
      lineId = answerer?.line_id;
    }

    if (!lineId || !LINE_ACCESS_TOKEN) {
      return NextResponse.json({ blocked: false, no_line_id: !lineId });
    }

    // LINE Profile APIでブロック確認
    // 404の理由: ①ID不在 ②同意なし ③未フォロー ④ブロック
    // このシステムではline_idはフォロー時にwebhookで保存されるため、
    // 404 = 実質ブロック。ただし念のためmessage_logに過去の記録があるか確認する
    const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineId}`, {
      headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
      cache: "no-store",
    });

    const blocked = !profileRes.ok;

    if (blocked) {
      // line_idがintake/answersにある = 一度はフォロー済み（Lステ移行含む）
      // 最新のイベントが既にブロックなら重複挿入しない
      const { data: lastEvent } = await supabaseAdmin
        .from("message_log")
        .select("id, event_type")
        .eq("patient_id", patientId)
        .eq("message_type", "event")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastEvent || lastEvent.event_type !== "unfollow") {
        await supabaseAdmin.from("message_log").insert({
          patient_id: patientId,
          line_uid: lineId,
          direction: "incoming",
          event_type: "unfollow",
          message_type: "event",
          content: "ブロック（友だち解除）",
          status: "received",
        });
      }
    }

    return NextResponse.json({ blocked });
  } catch (e: any) {
    console.error("[Check Block] error:", e?.message || e);
    return NextResponse.json({ blocked: false, error: e?.message });
  }
}
