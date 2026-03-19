import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { lineSendSchema } from "@/lib/validations/line-broadcast";
import { handleImplicitAiFeedback } from "@/lib/ai-reply";
import { sanitizeFlexContents } from "@/lib/flex-sanitize";
import { invalidateFriendsListCache } from "@/lib/redis";
import { buildImagemapMessage, getImagemapBaseUrl } from "@/lib/line-imagemap";
import type { ImagemapData } from "@/lib/line-imagemap";

// 個別メッセージ送信
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const parsed = await parseBody(req, lineSendSchema);
  if ("error" in parsed) return parsed.error;
  const { patient_id, message, message_type, flex, template_name, scheduled_at, imagemap } = parsed.data;
  if (!message?.trim() && !flex && !imagemap) {
    return badRequest("message, flex, または imagemap は必須です");
  }

  // 患者の LINE UID・名前を patients テーブルから取得
  const { data: patient } = await strictWithTenant(
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

  // --- 予約送信モード: scheduled_at が指定されている場合 ---
  if (scheduled_at) {
    const scheduledDate = new Date(scheduled_at);
    // 過去の日時は拒否（5分未満の猶予は許容しない）
    if (scheduledDate.getTime() < Date.now() + 3 * 60 * 1000) {
      return badRequest("予約送信は現在時刻から5分以上先を指定してください");
    }

    // Flexメッセージの場合
    let flexJson = null;
    let msgContent = message || "";
    if (message_type === "flex" && flex) {
      const rawFlex = flex as Record<string, unknown>;
      const rawContents = rawFlex.contents ?? rawFlex;
      flexJson = sanitizeFlexContents(rawContents);
      msgContent = (rawFlex.altText as string) || "Flex Message";
    }

    // scheduled_messages に登録
    const { data: scheduled, error: schedErr } = await supabaseAdmin
      .from("scheduled_messages")
      .insert({
        ...tenantPayload(tenantId),
        patient_id,
        line_uid: patient.line_id,
        message_content: msgContent,
        message_type: message_type || "text",
        flex_json: flexJson,
        scheduled_at,
        created_by: "admin",
      })
      .select("id, scheduled_at, created_at")
      .single();

    if (schedErr) return serverError(schedErr.message);

    return NextResponse.json({
      ok: true,
      status: "scheduled",
      schedule_id: scheduled.id,
      scheduled_at: scheduled.scheduled_at,
      patient_name: patient.name,
    });
  }

  // Imagemap Message送信
  if (message_type === "imagemap" && imagemap) {
    const imData = imagemap as { imageUrl: string; altText?: string; data: ImagemapData };
    const origin = req.nextUrl.origin;
    const baseUrl = getImagemapBaseUrl(origin, imData.imageUrl);
    const imagemapMsg = buildImagemapMessage(baseUrl, imData.altText || template_name || "リッチメッセージ", imData.data);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imRes = await pushMessage(patient.line_id, [imagemapMsg as any], tenantId ?? undefined);
    if (!imRes) {
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tenantId),
        patient_id,
        line_uid: patient.line_id,
        event_type: "message",
        message_type: "imagemap",
        content: `【${template_name || "リッチメッセージ"}】${imData.imageUrl}`,
        status: "failed",
        direction: "outgoing",
      });
      return NextResponse.json({ ok: false, error: "LINEチャネルアクセストークンが未設定です", status: "failed" }, { status: 500 });
    }
    const imStatus = imRes.ok ? "sent" : "failed";
    let imLineError = "";
    if (!imRes.ok) imLineError = await imRes.text().catch(() => "");

    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id,
      line_uid: patient.line_id,
      event_type: "message",
      message_type: "imagemap",
      content: `【${template_name || "リッチメッセージ"}】${imData.imageUrl}`,
      status: imStatus,
      direction: "outgoing",
    });

    if (!imRes.ok) {
      return NextResponse.json({ ok: false, error: `LINE API エラー: ${imLineError}`, status: "failed" });
    }
    invalidateFriendsListCache(tenantId || "00000000-0000-0000-0000-000000000001").catch(() => {});
    return NextResponse.json({ ok: true, status: "sent", patient_name: patient.name });
  }

  // Flex Message送信
  if (message_type === "flex" && flex) {
    const rawFlex = flex as Record<string, unknown>;
    const rawContents = rawFlex.contents ?? rawFlex;
    // サニタイズ（無効プロパティ修正 + 不要キー除去 + type補完 + 配列→carousel変換）
    const contents = sanitizeFlexContents(rawContents);

    const flexMsg = { type: "flex" as const, altText: (rawFlex.altText as string) || "Flex Message", contents: contents as Record<string, unknown> };

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

    const { data: flexLog } = await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id,
      line_uid: patient.line_id,
      event_type: "message",
      message_type: "flex",
      content: `[${(flexMsg.altText as string) || "Flex Message"}]`,
      flex_json: flexMsg.contents,
      status,
      direction: "outgoing",
    }).select("id, sent_at").single();

    if (!res.ok) {
      console.error("[Flex Send] LINE API Error:", lineError);
      return NextResponse.json({
        ok: false,
        error: `LINE API エラー: ${lineError}`,
        status: "failed",
      });
    }
    return NextResponse.json({ ok: true, status: "sent", patient_name: patient.name, messageId: flexLog?.id, sentAt: flexLog?.sent_at });
  }

  // 次回予約を取得（キャンセル済み除外、本日以降で最も近いもの）
  const { data: nextReservation } = await strictWithTenant(
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
  const { data: msgLog } = await supabaseAdmin.from("message_log").insert({
    ...tenantPayload(tenantId),
    patient_id,
    line_uid: patient.line_id,
    event_type: "message",
    message_type: "individual",
    content: logContent,
    status,
    direction: "outgoing",
  }).select("id, sent_at").single();

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: `LINE API エラー: ${lineError}`, status: "failed" });
  }

  // スタッフ手動返信 → pending AIドラフトがあれば暗黙フィードバック（fire-and-forget）
  if (message_type !== "image") {
    handleImplicitAiFeedback(patient_id, resolvedMessage, tenantId).catch(() => {});
  }

  // friends-list Redisキャッシュ無効化（fire-and-forget）
  invalidateFriendsListCache(tenantId || "00000000-0000-0000-0000-000000000001").catch(() => {});

  return NextResponse.json({ ok: true, status: "sent", patient_name: patient.name, messageId: msgLog?.id, sentAt: msgLog?.sent_at });
}
