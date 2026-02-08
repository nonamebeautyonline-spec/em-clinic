import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";

// 個別メッセージ送信
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { patient_id, message, message_type, flex, template_name } = await req.json();
  if (!patient_id || (!message?.trim() && !flex)) {
    return NextResponse.json({ error: "patient_id と message は必須です" }, { status: 400 });
  }

  // 患者のLINE UIDを取得
  const { data: intake } = await supabaseAdmin
    .from("intake")
    .select("line_id, patient_name")
    .eq("patient_id", patient_id)
    .not("line_id", "is", null)
    .limit(1)
    .single();

  if (!intake?.line_id) {
    // メッセージログに記録（失敗）
    await supabaseAdmin.from("message_log").insert({
      patient_id,
      message_type: "individual",
      content: message,
      status: "no_uid",
      direction: "outgoing",
    });
    return NextResponse.json({ error: "LINE UIDが見つかりません", status: "no_uid" }, { status: 400 });
  }

  // Flex Message送信
  if (message_type === "flex" && flex) {
    const res = await pushMessage(intake.line_id, [flex]);
    const status = res?.ok ? "sent" : "failed";

    await supabaseAdmin.from("message_log").insert({
      patient_id,
      line_uid: intake.line_id,
      message_type: "individual",
      content: `[${flex.altText || "Flex Message"}]`,
      status,
      direction: "outgoing",
    });

    return NextResponse.json({ ok: status === "sent", status, patient_name: intake.patient_name });
  }

  // 次回予約を取得（キャンセル済み除外、本日以降で最も近いもの）
  const { data: nextReservation } = await supabaseAdmin
    .from("reservations")
    .select("reserved_date, reserved_time")
    .eq("patient_id", patient_id)
    .neq("status", "canceled")
    .gte("reserved_date", new Date().toISOString().split("T")[0])
    .order("reserved_date", { ascending: true })
    .order("reserved_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  // テンプレート変数を置換
  const resolvedMessage = message
    .replace(/\{name\}/g, intake.patient_name || "")
    .replace(/\{patient_id\}/g, patient_id)
    .replace(/\{send_date\}/g, new Date().toLocaleDateString("ja-JP"))
    .replace(/\{next_reservation_date\}/g, nextReservation?.reserved_date || "")
    .replace(/\{next_reservation_time\}/g, nextReservation?.reserved_time?.substring(0, 5) || "");

  // LINE Push送信（画像テンプレートの場合は image メッセージ）
  const lineMessage = message_type === "image"
    ? { type: "image" as const, originalContentUrl: resolvedMessage, previewImageUrl: resolvedMessage }
    : { type: "text" as const, text: resolvedMessage };
  const res = await pushMessage(intake.line_id, [lineMessage]);
  const status = res?.ok ? "sent" : "failed";

  // メッセージログに記録（画像テンプレはテンプレ名のみ保存）
  const logContent = message_type === "image" && template_name
    ? `【${template_name}】`
    : resolvedMessage;
  await supabaseAdmin.from("message_log").insert({
    patient_id,
    line_uid: intake.line_id,
    message_type: "individual",
    content: logContent,
    status,
    direction: "outgoing",
  });

  return NextResponse.json({ ok: status === "sent", status, patient_name: intake.patient_name });
}
