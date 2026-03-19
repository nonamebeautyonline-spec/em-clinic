import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { evaluateMenuRules } from "@/lib/menu-auto-rules";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { patientTagAddSchema } from "@/lib/validations/admin-operations";

// 患者のタグ一覧取得
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id } = await params;

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("patient_tags")
      .select("*, tag_definitions(*)")
      .eq("patient_id", id),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ tags: data });
}

// 患者にタグを付与
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id } = await params;
  const parsed = await parseBody(req, patientTagAddSchema);
  if ("error" in parsed) return parsed.error;
  const { tag_id } = parsed.data;

  const { error } = await supabaseAdmin
    .from("patient_tags")
    .upsert({ ...tenantPayload(tenantId), patient_id: id, tag_id, assigned_by: "admin" }, { onConflict: "patient_id,tag_id" });

  if (error) return serverError(error.message);
  // メニュー自動切替ルール評価（非同期・失敗無視）
  evaluateMenuRules(id, tenantId ?? undefined).catch(() => {});
  return NextResponse.json({ ok: true });
}

// 患者からタグを解除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const tagId = searchParams.get("tag_id");

  if (!tagId) return badRequest("tag_id required");

  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("patient_tags")
      .delete()
      .eq("patient_id", id)
      .eq("tag_id", Number(tagId)),
    tenantId
  );

  if (error) return serverError(error.message);
  // メニュー自動切替ルール評価（非同期・失敗無視）
  evaluateMenuRules(id, tenantId ?? undefined).catch(() => {});
  return NextResponse.json({ ok: true });
}
