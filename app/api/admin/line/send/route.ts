import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { lineSendSchema } from "@/lib/validations/line-broadcast";
import { handleImplicitAiFeedback } from "@/lib/ai-reply";

// 個別メッセージ送信
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, lineSendSchema);
  if ("error" in parsed) return parsed.error;
  const { patient_id, message, message_type, flex, template_name } = parsed.data;
  if (!message?.trim() && !flex) {
    return NextResponse.json({ error: "message または flex は必須です" }, { status: 400 });
  }

  // 患者の LINE UID・名前を patients テーブルから取得
  const { data: patient } = await withTenant(
    supabaseAdmin.from("patients").select("name, line_id").eq("patient_id", patient_id),
    tenantId
  ).maybeSingle();

  if (!patient?.line_id) {
    // メッセージログに記録（失敗）
    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id,
      event_type: "message",
      message_type: "individual",
      content: message,
      status: "no_uid",
      direction: "outgoing",
    });
    return NextResponse.json({ error: "LINE UIDが見つかりません", status: "no_uid" }, { status: 400 });
  }

  // Flex Message送信
  if (message_type === "flex" && flex) {
    // Flexデータの正規化: contentsがbubble/carouselコンテナになるよう調整
    const rawFlex = flex as any;
    let contents = rawFlex.contents;
    // flex_contentが { type: "flex", contents: {...} } 形式で保存されている場合はアンラップ
    if (contents && typeof contents === "object" && !Array.isArray(contents) && contents.type === "flex" && contents.contents) {
      contents = contents.contents;
    }
    // flex_contentが配列の場合はcarouselでラップ
    if (Array.isArray(contents)) {
      contents = contents.length === 1 ? contents[0] : { type: "carousel", contents };
    }
    const flexMsg = { type: "flex" as const, altText: rawFlex.altText || "Flex Message", contents };
    const res = await pushMessage(patient.line_id, [flexMsg], tenantId ?? undefined);

    // pushMessageがnullを返す = トークン未設定
    if (!res) {
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tenantId),
        patient_id,
        line_uid: patient.line_id,
        event_type: "message",
        message_type: "flex",
        content: `[${(flexMsg.altText as string) || "Flex Message"}]`,
        flex_json: flexMsg.contents,
        status: "failed",
        direction: "outgoing",
      });
      return NextResponse.json({ ok: false, error: "LINEチャネルアクセストークンが未設定です", status: "failed" }, { status: 500 });
    }

    // LINE APIエラーの場合は詳細を取得
    let lineError = "";
    if (!res.ok) {
      lineError = await res.text().catch(() => "");
    }
    const status = res.ok ? "sent" : "failed";

    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id,
      line_uid: patient.line_id,
      event_type: "message",
      message_type: "flex",
      content: `[${(flexMsg.altText as string) || "Flex Message"}]`,
      flex_json: flexMsg.contents,
      status,
      direction: "outgoing",
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `LINE API エラー: ${lineError}`, status: "failed" });
    }
    return NextResponse.json({ ok: true, status: "sent", patient_name: patient.name });
  }

  // 次回予約を取得（キャンセル済み除外、本日以降で最も近いもの）
  const { data: nextReservation } = await withTenant(
    supabaseAdmin.from("reservations").select("reserved_date, reserved_time").eq("patient_id", patient_id).neq("status", "canceled").gte("reserved_date", new Date().toISOString().split("T")[0]).order("reserved_date", { ascending: true }).order("reserved_time", { ascending: true }).limit(1),
    tenantId
  ).maybeSingle();

  // テンプレート変数を置換
  const resolvedMessage = (message || "")
    .replace(/\{name\}/g, patient.name || "")
    .replace(/\{patient_id\}/g, patient_id)
    .replace(/\{send_date\}/g, new Date().toLocaleDateString("ja-JP"))
    .replace(/\{next_reservation_date\}/g, nextReservation?.reserved_date || "")
    .replace(/\{next_reservation_time\}/g, nextReservation?.reserved_time?.substring(0, 5) || "");

  // LINE Push送信（画像テンプレートの場合は image メッセージ）
  const lineMessage = message_type === "image"
    ? { type: "image" as const, originalContentUrl: resolvedMessage, previewImageUrl: resolvedMessage }
    : { type: "text" as const, text: resolvedMessage };
  const res = await pushMessage(patient.line_id, [lineMessage], tenantId ?? undefined);

  if (!res) {
    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id,
      line_uid: patient.line_id,
      event_type: "message",
      message_type: "individual",
      content: resolvedMessage,
      status: "failed",
      direction: "outgoing",
    });
    return NextResponse.json({ ok: false, error: "LINEチャネルアクセストークンが未設定です", status: "failed" }, { status: 500 });
  }

  // LINE APIエラーの場合は詳細を取得
  let lineError = "";
  if (!res.ok) {
    lineError = await res.text().catch(() => "");
  }
  const status = res.ok ? "sent" : "failed";

  // メッセージログに記録（画像テンプレは【テンプレ名】URL形式で保存）
  const logContent = message_type === "image" && template_name
    ? `【${template_name}】${resolvedMessage}`
    : resolvedMessage;
  await supabaseAdmin.from("message_log").insert({
    ...tenantPayload(tenantId),
    patient_id,
    line_uid: patient.line_id,
    event_type: "message",
    message_type: "individual",
    content: logContent,
    status,
    direction: "outgoing",
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: `LINE API エラー: ${lineError}`, status: "failed" });
  }

  // スタッフ手動返信 → pending AIドラフトがあれば暗黙フィードバック（fire-and-forget）
  if (message_type !== "image") {
    handleImplicitAiFeedback(patient_id, resolvedMessage, tenantId).catch(() => {});
  }

  return NextResponse.json({ ok: true, status: "sent", patient_name: patient.name });
}
