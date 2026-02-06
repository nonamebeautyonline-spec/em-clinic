import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";

// 個別メッセージ送信
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { patient_id, message } = await req.json();
  if (!patient_id || !message?.trim()) {
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
    });
    return NextResponse.json({ error: "LINE UIDが見つかりません", status: "no_uid" }, { status: 400 });
  }

  // テンプレート変数を置換
  const resolvedMessage = message
    .replace(/\{name\}/g, intake.patient_name || "")
    .replace(/\{patient_id\}/g, patient_id);

  // LINE Push送信
  const res = await pushMessage(intake.line_id, [{ type: "text", text: resolvedMessage }]);
  const status = res?.ok ? "sent" : "failed";

  // メッセージログに記録
  await supabaseAdmin.from("message_log").insert({
    patient_id,
    line_uid: intake.line_id,
    message_type: "individual",
    content: resolvedMessage,
    status,
  });

  return NextResponse.json({ ok: status === "sent", status, patient_name: intake.patient_name });
}
