import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";

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

  const tenantId = resolveTenantId(req);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return badRequest("ファイルは必須です");
  }

  if (file.size > MAX_SIZE) {
    return badRequest("ファイルサイズは10MB以下にしてください");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return badRequest("JPEG、PNG、WebP形式のみ対応しています");
  }

  await ensureBucket();

  const ext = file.name.split(".").pop() || "jpg";
  const tenantPrefix = tenantId ? `${tenantId}/` : "";
  const fileName = `templates/${tenantPrefix}${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return serverError("画像アップロード失敗: " + uploadError.message);
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);

  return NextResponse.json({ ok: true, url: urlData.publicUrl });
}
