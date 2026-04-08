// 管理画面: 診療分野 CRUD API
import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, tenantPayload, strictWithTenant } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { isMultiFieldEnabled } from "@/lib/medical-fields";

/** GET: テナントの全分野一覧（非アクティブ含む） */
export async function GET(req: NextRequest) {
  if (!(await verifyAdminAuth(req))) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const [{ data, error }, multiFieldEnabled] = await Promise.all([
    strictWithTenant(
      supabaseAdmin
        .from("medical_fields")
        .select("*")
        .order("sort_order", { ascending: true }),
      tenantId
    ),
    isMultiFieldEnabled(tenantId),
  ]);

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true, fields: data ?? [], multiFieldEnabled });
}

/** POST: 分野を新規作成 */
export async function POST(req: NextRequest) {
  if (!(await verifyAdminAuth(req))) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const body = await req.json();
  const { slug, name, description, icon_url, color_theme, sort_order, flow_config } = body;

  if (!slug || !name) return badRequest("slug と name は必須です");

  // slug の重複チェック
  const { data: existing } = await supabaseAdmin
    .from("medical_fields")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return badRequest(`slug "${slug}" は既に使用されています`);

  const { data, error } = await supabaseAdmin
    .from("medical_fields")
    .insert({
      ...tenantPayload(tenantId),
      slug,
      name,
      description: description || null,
      icon_url: icon_url || null,
      color_theme: color_theme || "emerald",
      sort_order: sort_order ?? 0,
      is_active: true,
      flow_config: flow_config || {},
    })
    .select()
    .single();

  if (error) return serverError(error.message);

  logAudit(req, "medical_fields.create", "medical_fields", data.id);
  return NextResponse.json({ ok: true, field: data });
}

/** PUT: 分野を更新 */
export async function PUT(req: NextRequest) {
  if (!(await verifyAdminAuth(req))) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const body = await req.json();
  const { id, slug, name, description, icon_url, color_theme, sort_order, is_active, flow_config } = body;

  if (!id) return badRequest("id は必須です");

  // 対象が自テナントのものか確認
  const { data: existing } = await supabaseAdmin
    .from("medical_fields")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!existing) return badRequest("指定された分野が見つかりません");

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (slug !== undefined) updateData.slug = slug;
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description || null;
  if (icon_url !== undefined) updateData.icon_url = icon_url || null;
  if (color_theme !== undefined) updateData.color_theme = color_theme;
  if (sort_order !== undefined) updateData.sort_order = sort_order;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (flow_config !== undefined) updateData.flow_config = flow_config;

  const { data, error } = await supabaseAdmin
    .from("medical_fields")
    .update(updateData)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return serverError(error.message);

  logAudit(req, "medical_fields.update", "medical_fields", id);
  return NextResponse.json({ ok: true, field: data });
}

/** DELETE: 分野を削除（関連データがある場合は無効化のみ） */
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdminAuth(req))) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("id は必須です");

  // 関連データの存在チェック（intake, products, reservations, reorders, orders）
  const tables = ["intake", "products", "reservations", "reorders", "orders"];
  for (const table of tables) {
    const { count } = await supabaseAdmin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("field_id", id);

    if (count && count > 0) {
      // 関連データがある場合は無効化のみ
      const { error } = await supabaseAdmin
        .from("medical_fields")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) return serverError(error.message);

      logAudit(req, "medical_fields.deactivate", "medical_fields", id);
      return NextResponse.json({
        ok: true,
        deactivated: true,
        message: "関連データがあるため無効化しました",
      });
    }
  }

  // 関連データがなければ物理削除
  const { error } = await supabaseAdmin
    .from("medical_fields")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return serverError(error.message);

  logAudit(req, "medical_fields.delete", "medical_fields", id);
  return NextResponse.json({ ok: true, deleted: true });
}
