import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { evaluateMenuRules } from "@/lib/menu-auto-rules";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { patientMarkUpdateSchema } from "@/lib/validations/admin-operations";

// 対応マーク取得
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  const { data } = await withTenant(
    supabaseAdmin
      .from("patient_marks")
      .select("*")
      .eq("patient_id", id)
      .single(),
    tenantId
  );

  return NextResponse.json({ mark: data || { patient_id: id, mark: "none", note: null } });
}

// 対応マーク更新
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id } = await params;
  const parsed = await parseBody(req, patientMarkUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const { mark, note } = parsed.data;

  // "none" は常に許可、それ以外は mark_definitions テーブルで検証
  if (mark !== "none") {
    const { data: markDef } = await withTenant(
      supabaseAdmin
        .from("mark_definitions")
        .select("id")
        .eq("value", mark)
        .maybeSingle(),
      tenantId
    );
    if (!markDef) return badRequest("Invalid mark");
  }

  const { error } = await withTenant(
    supabaseAdmin
      .from("patient_marks")
      .upsert({
        ...tenantPayload(tenantId),
        patient_id: id,
        mark,
        note: note || null,
        updated_at: new Date().toISOString(),
        updated_by: "admin",
      }, { onConflict: "patient_id" }),
    tenantId
  );

  if (error) return serverError(error.message);
  // メニュー自動切替ルール評価（非同期・失敗無視）
  evaluateMenuRules(id, tenantId ?? undefined).catch(() => {});
  return NextResponse.json({ ok: true });
}
