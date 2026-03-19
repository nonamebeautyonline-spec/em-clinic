import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateMediaSchema } from "@/lib/validations/line-management";

const BUCKET = "line-images";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_MENU_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  }
}

// メディア一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folder_id");
  const fileType = searchParams.get("file_type");
  const search = searchParams.get("search");

  let query = supabaseAdmin
    .from("media_files")
    .select("*, media_folders(name)")
    .order("created_at", { ascending: false });

  if (folderId) query = query.eq("folder_id", parseInt(folderId));
  if (fileType) query = query.eq("file_type", fileType);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await strictWithTenant(query, tenantId);
  if (error) return serverError(error.message);

  return NextResponse.json({ files: data });
}

// メディアアップロード
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const fileType = formData.get("file_type") as string | null;
  const folderId = formData.get("folder_id") as string | null;

  if (!file) {
    return badRequest("ファイルは必須です");
  }

  if (!fileType || !["image", "menu_image", "pdf"].includes(fileType)) {
    return badRequest("ファイル種別が無効です");
  }

  // タイプ別バリデーション
  const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const pdfTypes = ["application/pdf"];

  if (fileType === "image") {
    if (!imageTypes.includes(file.type)) {
      return badRequest("画像はJPEG、PNG、GIF、WebP形式のみ対応");
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return badRequest("画像は10MB以下にしてください");
    }
  } else if (fileType === "menu_image") {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      return badRequest("メニュー画像はJPEG、PNG形式のみ対応");
    }
    if (file.size > MAX_MENU_IMAGE_SIZE) {
      return badRequest("メニュー画像は1MB以下にしてください");
    }
  } else if (fileType === "pdf") {
    if (!pdfTypes.includes(file.type)) {
      return badRequest("PDF形式のみ対応");
    }
    if (file.size > MAX_PDF_SIZE) {
      return badRequest("PDFは10MB以下にしてください");
    }
  }

  await ensureBucket();

  const ext = file.name.split(".").pop() || "bin";
  const storagePath = `media/${fileType}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return serverError("アップロード失敗: " + uploadError.message);
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);

  // DB登録
  const { data: inserted, error: dbError } = await supabaseAdmin
    .from("media_files")
    .insert({
      ...tenantPayload(tenantId),
      name: file.name,
      file_url: urlData.publicUrl,
      file_type: fileType,
      mime_type: file.type,
      file_size: file.size,
      folder_id: folderId ? parseInt(folderId) : null,
    })
    .select()
    .single();

  if (dbError) {
    return serverError("DB登録失敗: " + dbError.message);
  }

  return NextResponse.json({ ok: true, file: inserted });
}

// メディア更新（名前変更・フォルダ移動）
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, updateMediaSchema);
  if ("error" in parsed) return parsed.error;
  const { id, name, folder_id } = parsed.data;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (folder_id !== undefined) updates.folder_id = folder_id;

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("media_files")
      .update(updates)
      .eq("id", id),
    tenantId
  ).select().single();

  if (error) return serverError(error.message);

  return NextResponse.json({ ok: true, file: data });
}

// メディア削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("IDは必須です");

  // ストレージのファイルも削除
  const { data: file } = await strictWithTenant(
    supabaseAdmin
      .from("media_files")
      .select("file_url")
      .eq("id", parseInt(id)),
    tenantId
  ).single();

  if (file?.file_url) {
    const url = new URL(file.file_url);
    const pathParts = url.pathname.split(`/storage/v1/object/public/${BUCKET}/`);
    if (pathParts[1]) {
      await supabaseAdmin.storage.from(BUCKET).remove([pathParts[1]]);
    }
  }

  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("media_files")
      .delete()
      .eq("id", parseInt(id)),
    tenantId
  );

  if (error) return serverError(error.message);

  return NextResponse.json({ ok: true });
}
