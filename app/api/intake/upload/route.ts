// 問診フォーム用画像アップロードAPI
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPatientSession } from "@/lib/patient-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/heic"];

export async function POST(req: NextRequest) {
  try {
    const session = await verifyPatientSession(req);
    if (!session) return unauthorized();
    const patientId = session.patientId;
    const tenantId = resolveTenantIdOrThrow(req);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fieldId = formData.get("field_id") as string | null;

    if (!file) return badRequest("ファイルが指定されていません");
    if (!fieldId) return badRequest("field_id が指定されていません");
    if (file.size > MAX_FILE_SIZE) return badRequest("ファイルサイズは10MB以下にしてください");
    if (!ALLOWED_TYPES.includes(file.type)) return badRequest("画像ファイル（jpeg、png、gif、heic）のみ対応しています");

    // ファイル名生成
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const timestamp = Date.now();
    const storagePath = `intake-uploads/${tenantId}/${patientId}/${fieldId}/${timestamp}.${ext}`;

    // Supabase Storageにアップロード
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from("media")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[intake/upload] Storage error:", uploadError);
      return serverError("ファイルのアップロードに失敗しました");
    }

    // 公開URLを取得
    const { data: urlData } = supabaseAdmin.storage
      .from("media")
      .getPublicUrl(storagePath);

    return NextResponse.json({
      ok: true,
      file_url: urlData.publicUrl,
      storage_path: storagePath,
    });
  } catch (error) {
    console.error("[intake/upload] Error:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
