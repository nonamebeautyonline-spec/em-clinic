// 問診テンプレート有効化API (POST)
// 指定テンプレートをアクティブにし、同テナント・同分野の他を全て非アクティブにする
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, badRequest, notFound } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { isMultiFieldEnabled } from "@/lib/medical-fields";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  const templateId = body.id;
  if (!templateId)
    return badRequest("テンプレートIDが必要です");

  // 対象テンプレートの存在確認（field_id も取得）
  const { data: target, error: fetchError } = await strictWithTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("id, field_id")
      .eq("id", templateId),
    tenantId,
  ).maybeSingle();

  if (fetchError)
    return serverError(fetchError.message);

  if (!target)
    return notFound("テンプレートが見つかりません");

  const multiField = await isMultiFieldEnabled(tenantId);

  // 同テナント（マルチ分野時は同分野）のテンプレートを非アクティブに
  let deactivateQuery = strictWithTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .update({ is_active: false, updated_at: new Date().toISOString() }),
    tenantId,
  );

  // マルチ分野モード: 同じ分野のテンプレートのみ非アクティブに（他分野はそのまま）
  if (multiField && target.field_id) {
    deactivateQuery = deactivateQuery.eq("field_id", target.field_id);
  }

  const { error: deactivateError } = await deactivateQuery;

  if (deactivateError)
    return serverError(deactivateError.message);

  // 対象テンプレートをアクティブに
  const { error: activateError } = await supabaseAdmin
    .from("intake_form_definitions")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", templateId);

  if (activateError)
    return serverError(activateError.message);

  logAudit(req, "intake_form.activate", "intake_form", String(templateId));
  return NextResponse.json({ ok: true });
}
