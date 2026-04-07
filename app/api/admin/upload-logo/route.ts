// app/api/admin/upload-logo/route.ts — テナントロゴ画像アップロード
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

const BUCKET = "tenant-assets";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

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

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const uploadType = (formData.get("type") as string) || "logo";

    if (!file) return badRequest("ファイルが必要です");
    if (file.size > MAX_SIZE) return badRequest("ファイルサイズは2MB以下にしてください");
    if (!ALLOWED_TYPES.includes(file.type)) return badRequest("JPG, PNG, WebP, SVG のみアップロード可能です");

    await ensureBucket();

    const ext = file.name.split(".").pop() || "png";
    const fileName = uploadType === "clinic-name" ? "clinic-name" : "logo";
    const path = `${tenantId}/${fileName}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[upload-logo] upload error:", uploadError);
      return serverError("アップロードに失敗しました");
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(path);

    // キャッシュバスティング
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (err) {
    console.error("[upload-logo] error:", err);
    return serverError(String(err));
  }
}
