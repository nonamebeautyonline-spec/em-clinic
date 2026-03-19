import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";

// 登録済みメディア画像をLINE送信するAPI
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { patient_id, image_url } = body;

  if (!patient_id || !image_url) {
    return badRequest("patient_id と image_url は必須です");
  }

  // 患者のLINE UIDを取得
  const { data: patient } = await strictWithTenant(
    supabaseAdmin.from("patients").select("name, line_id").eq("patient_id", patient_id),
    tenantId
  ).maybeSingle();

  if (!patient?.line_id) {
    return badRequest("LINE UIDが見つかりません");
  }

  // LINE Push送信
  const res = await pushMessage(patient.line_id, [
    { type: "image", originalContentUrl: image_url, previewImageUrl: image_url },
  ], tenantId ?? undefined);
  const status = res?.ok ? "sent" : "failed";

  // メッセージログに記録
  const { data: imgLog } = await supabaseAdmin.from("message_log").insert({
    ...tenantPayload(tenantId),
    patient_id,
    line_uid: patient.line_id,
    event_type: "message",
    message_type: "individual",
    content: image_url,
    status,
    direction: "outgoing",
  }).select("id, sent_at").single();

  return NextResponse.json({
    ok: status === "sent",
    status,
    imageUrl: image_url,
    messageId: imgLog?.id,
    sentAt: imgLog?.sent_at,
  });
}
