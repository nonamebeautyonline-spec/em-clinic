import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

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
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
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

  const { data, error } = await withTenant(query, tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ files: data });
}

// メディアアップロード
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const fileType = formData.get("file_type") as string | null;
  const folderId = formData.get("folder_id") as string | null;

  if (!file) {
    return NextResponse.json({ error: "ファイルは必須です" }, { status: 400 });
  }

  if (!fileType || !["image", "menu_image", "pdf"].includes(fileType)) {
    return NextResponse.json({ error: "ファイル種別が無効です" }, { status: 400 });
  }

  // タイプ別バリデーション
  const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const pdfTypes = ["application/pdf"];

  if (fileType === "image") {
    if (!imageTypes.includes(file.type)) {
      return NextResponse.json({ error: "画像はJPEG、PNG、GIF、WebP形式のみ対応" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "画像は10MB以下にしてください" }, { status: 400 });
    }
  } else if (fileType === "menu_image") {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      return NextResponse.json({ error: "メニュー画像はJPEG、PNG形式のみ対応" }, { status: 400 });
    }
    if (file.size > MAX_MENU_IMAGE_SIZE) {
      return NextResponse.json({ error: "メニュー画像は1MB以下にしてください" }, { status: 400 });
    }
  } else if (fileType === "pdf") {
    if (!pdfTypes.includes(file.type)) {
      return NextResponse.json({ error: "PDF形式のみ対応" }, { status: 400 });
    }
    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json({ error: "PDFは10MB以下にしてください" }, { status: 400 });
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
    return NextResponse.json({ error: "アップロード失敗: " + uploadError.message }, { status: 500 });
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
    return NextResponse.json({ error: "DB登録失敗: " + dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, file: inserted });
}

// メディア更新（名前変更・フォルダ移動）
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const body = await req.json();
  const { id, name, folder_id } = body;

  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (folder_id !== undefined) updates.folder_id = folder_id;

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("media_files")
      .update(updates)
      .eq("id", id),
    tenantId
  ).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, file: data });
}

// メディア削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  // ストレージのファイルも削除
  const { data: file } = await withTenant(
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

  const { error } = await withTenant(
    supabaseAdmin
      .from("media_files")
      .delete()
      .eq("id", parseInt(id)),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
