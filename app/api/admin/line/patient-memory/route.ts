// 患者メモリAPI（Phase 1-4）
// GET: 患者のメモリ一覧 / POST: メモリ追加 / DELETE: メモリ無効化

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { savePatientMemory, deactivateMemory } from "@/lib/ai-patient-memory";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// メモリ一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const patientId = req.nextUrl.searchParams.get("patient_id");
  if (!patientId) return badRequest("patient_idが必要です");

  try {
    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("ai_patient_memory")
        .select("id, patient_id, memory_type, content, source, created_at, updated_at, expires_at, is_active")
        .eq("patient_id", patientId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false }),
      tenantId
    );

    if (error) {
      console.error("[PatientMemory API] 取得エラー:", error);
      return serverError("メモリの取得に失敗しました");
    }

    return NextResponse.json({ memories: data || [] });
  } catch (err) {
    console.error("[PatientMemory API] 例外:", err);
    return serverError("メモリの取得に失敗しました");
  }
}

// メモリ追加
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const body = await req.json();
    const { patient_id, memory_type, content } = body;
    if (!patient_id || !memory_type || !content) {
      return badRequest("patient_id, memory_type, contentが必要です");
    }

    const ok = await savePatientMemory({
      tenantId,
      patientId: patient_id,
      memoryType: memory_type,
      content,
      source: "manual",
    });

    if (!ok) return serverError("メモリの保存に失敗しました");

    logAudit(req, "patient_memory.create", "ai_patient_memory", patient_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PatientMemory API] 追加例外:", err);
    return serverError("メモリの保存に失敗しました");
  }
}

// メモリ無効化
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { id } = await req.json();
    if (!id) return badRequest("IDが必要です");

    const ok = await deactivateMemory(id, tenantId);
    if (!ok) return serverError("メモリの無効化に失敗しました");

    logAudit(req, "patient_memory.delete", "ai_patient_memory", String(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PatientMemory API] 削除例外:", err);
    return serverError("メモリの無効化に失敗しました");
  }
}
