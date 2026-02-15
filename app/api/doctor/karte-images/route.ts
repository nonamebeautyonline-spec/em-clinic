// カルテ画像 API（アップロード・一覧取得・削除）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

const BUCKET = "karte-images";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  }
}

// 画像一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient_id");
  const reserveId = searchParams.get("reserve_id");

  if (!patientId && !reserveId) {
    return NextResponse.json(
      { error: "patient_id または reserve_id が必要です" },
      { status: 400 }
    );
  }

  let query = supabaseAdmin
    .from("karte_images")
    .select("*")
    .order("created_at", { ascending: false });

  if (patientId) query = query.eq("patient_id", patientId);
  if (reserveId) query = query.eq("reserve_id", reserveId);

  const { data, error } = await withTenant(query, tenantId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, images: data || [] });
}

// 画像アップロード
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const patientId = formData.get("patient_id") as string | null;
  const reserveId = formData.get("reserve_id") as string | null;
  const intakeId = formData.get("intake_id") as string | null;
  const label = (formData.get("label") as string) || "";
  const category = (formData.get("category") as string) || "progress";
  const memo = (formData.get("memo") as string) || "";

  if (!file) {
    return NextResponse.json(
      { error: "ファイルは必須です" },
      { status: 400 }
    );
  }
  if (!patientId) {
    return NextResponse.json(
      { error: "patient_id は必須です" },
      { status: 400 }
    );
  }

  // バリデーション
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "JPEG、PNG、WebP、HEIC形式のみ対応しています" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "ファイルサイズは10MB以下にしてください" },
      { status: 400 }
    );
  }

  await ensureBucket();

  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `${patientId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: "アップロード失敗: " + uploadError.message },
      { status: 500 }
    );
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  // DB登録
  const { data: inserted, error: dbError } = await supabaseAdmin
    .from("karte_images")
    .insert({
      ...tenantPayload(tenantId),
      patient_id: patientId,
      intake_id: intakeId ? parseInt(intakeId) : null,
      reserve_id: reserveId || null,
      image_url: urlData.publicUrl,
      label,
      category,
      memo,
      taken_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json(
      { error: "DB登録失敗: " + dbError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, image: inserted });
}

// 画像削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "IDは必須です" }, { status: 400 });
  }

  // ストレージのファイルも削除
  const { data: image } = await withTenant(
    supabaseAdmin
      .from("karte_images")
      .select("image_url")
      .eq("id", parseInt(id))
      .single(),
    tenantId
  );

  if (image?.image_url) {
    const url = new URL(image.image_url);
    const pathParts = url.pathname.split(
      `/storage/v1/object/public/${BUCKET}/`
    );
    if (pathParts[1]) {
      await supabaseAdmin.storage.from(BUCKET).remove([pathParts[1]]);
    }
  }

  const { error } = await withTenant(
    supabaseAdmin
      .from("karte_images")
      .delete()
      .eq("id", parseInt(id)),
    tenantId
  );

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
