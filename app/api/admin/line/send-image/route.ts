import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

const BUCKET = "line-images";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  }
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const patientId = formData.get("patient_id") as string | null;

  if (!file || !patientId) {
    return badRequest("file と patient_id は必須です");
  }

  if (file.size > MAX_SIZE) {
    return badRequest("ファイルサイズは10MB以下にしてください");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return badRequest("JPEG、PNG、WebP形式のみ対応しています");
  }

  // 患者の LINE UID を patients テーブルから取得
  const { data: patient } = await strictWithTenant(
    supabaseAdmin.from("patients").select("name, line_id").eq("patient_id", patientId),
    tenantId
  ).maybeSingle();

  if (!patient?.line_id) {
    return badRequest("LINE UIDが見つかりません");
  }

  // Supabase Storageにアップロード
  await ensureBucket();

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${patientId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return serverError("画像アップロード失敗: " + uploadError.message);
  }

  // 公開URLを取得
  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);
  const imageUrl = urlData.publicUrl;

  // LINE Push送信
  const res = await pushMessage(patient.line_id, [
    { type: "image", originalContentUrl: imageUrl, previewImageUrl: imageUrl },
  ], tenantId ?? undefined);
  const status = res?.ok ? "sent" : "failed";

  // メッセージログに記録
  const { data: imgLog } = await supabaseAdmin.from("message_log").insert({
    ...tenantPayload(tenantId),
    patient_id: patientId,
    line_uid: patient.line_id,
    event_type: "message",
    message_type: "individual",
    content: imageUrl,
    status,
    direction: "outgoing",
  }).select("id, sent_at").single();

  logAudit(req, "message.send_image", "message", "unknown");
  return NextResponse.json({ ok: status === "sent", status, imageUrl, messageId: imgLog?.id, sentAt: imgLog?.sent_at });
}
