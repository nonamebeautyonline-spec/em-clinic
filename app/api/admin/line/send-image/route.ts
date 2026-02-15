import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

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
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const patientId = formData.get("patient_id") as string | null;

  if (!file || !patientId) {
    return NextResponse.json({ error: "file と patient_id は必須です" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "ファイルサイズは10MB以下にしてください" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "JPEG、PNG、WebP形式のみ対応しています" }, { status: 400 });
  }

  // 患者の LINE UID を patients テーブルから取得
  const { data: patient } = await withTenant(
    supabaseAdmin.from("patients").select("name, line_id").eq("patient_id", patientId),
    tenantId
  ).maybeSingle();

  if (!patient?.line_id) {
    return NextResponse.json({ error: "LINE UIDが見つかりません" }, { status: 400 });
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
    return NextResponse.json({ error: "画像アップロード失敗: " + uploadError.message }, { status: 500 });
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
  await supabaseAdmin.from("message_log").insert({
    ...tenantPayload(tenantId),
    patient_id: patientId,
    line_uid: patient.line_id,
    message_type: "individual",
    content: imageUrl,
    status,
    direction: "outgoing",
  });

  return NextResponse.json({ ok: status === "sent", status, imageUrl });
}
