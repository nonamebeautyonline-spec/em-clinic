import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ファイルアップロード（認証不要）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // フォーム存在チェック
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("id, is_published")
    .eq("slug", slug)
    .single();

  if (!form || !form.is_published) {
    return NextResponse.json({ error: "フォームが見つかりません" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const fieldId = formData.get("field_id") as string | null;

  if (!file || !fieldId) {
    return NextResponse.json({ error: "ファイルとフィールドIDは必須です" }, { status: 400 });
  }

  // ファイルサイズ制限 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "ファイルサイズは10MB以下にしてください" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split(".").pop() || "bin";
  const fileName = `form-uploads/${form.id}/${fieldId}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("media")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage
    .from("media")
    .getPublicUrl(fileName);

  return NextResponse.json({
    ok: true,
    file_url: urlData.publicUrl,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
  });
}
