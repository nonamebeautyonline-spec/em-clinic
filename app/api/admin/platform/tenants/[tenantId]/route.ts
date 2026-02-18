// app/api/admin/platform/tenants/[tenantId]/route.ts
// テナント詳細取得・更新・削除API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { updateTenantSchema } from "@/lib/validations/platform-tenant";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET: テナント詳細取得
 * tenant_members, tenant_plans を JOIN して返す
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  const { tenantId } = await ctx.params;

  try {
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select(
        `
        id,
        name,
        slug,
        is_active,
        contact_email,
        contact_phone,
        address,
        notes,
        logo_url,
        created_at,
        updated_at,
        deleted_at,
        tenant_members (
          id,
          role,
          created_at,
          admin_users (
            id,
            name,
            email,
            platform_role,
            is_active,
            last_login_at,
            created_at
          )
        ),
        tenant_plans (
          id,
          plan_name,
          monthly_fee,
          setup_fee,
          started_at,
          expires_at,
          created_at
        )
      `,
      )
      .eq("id", tenantId)
      .is("deleted_at", null)
      .single();

    if (error || !tenant) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, tenant });
  } catch (err) {
    console.error("[platform/tenants/[id]] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "テナント情報の取得に失敗しました" },
      { status: 500 },
    );
  }
}

/**
 * PUT: テナント情報更新
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  const { tenantId } = await ctx.params;

  const parsed = await parseBody(req, updateTenantSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;

  try {
    // テナント存在確認
    const { data: existing } = await supabaseAdmin
      .from("tenants")
      .select("id, slug")
      .eq("id", tenantId)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    // slug変更がある場合、重複チェック
    if (data.slug && data.slug !== existing.slug) {
      const { data: slugExists } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("slug", data.slug)
        .is("deleted_at", null)
        .neq("id", tenantId)
        .maybeSingle();

      if (slugExists) {
        return NextResponse.json(
          { ok: false, error: "このスラグは既に使用されています" },
          { status: 409 },
        );
      }
    }

    // 更新データを構築
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.slug !== undefined) updatePayload.slug = data.slug;
    if (data.contactEmail !== undefined)
      updatePayload.contact_email = data.contactEmail;
    if (data.contactPhone !== undefined)
      updatePayload.contact_phone = data.contactPhone;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.logoUrl !== undefined) updatePayload.logo_url = data.logoUrl;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("tenants")
      .update(updatePayload)
      .eq("id", tenantId)
      .select("id, name, slug, is_active, updated_at")
      .single();

    if (updateErr) {
      console.error("[platform/tenants/[id]] PUT error:", updateErr);
      return NextResponse.json(
        { ok: false, error: "テナントの更新に失敗しました" },
        { status: 500 },
      );
    }

    // 監査ログ（fire-and-forget）
    logAudit(req, "update_tenant", "tenant", tenantId, {
      changes: data,
    });

    return NextResponse.json({ ok: true, tenant: updated });
  } catch (err) {
    console.error("[platform/tenants/[id]] PUT unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}

/**
 * DELETE: テナントのソフトデリート
 * deleted_at をセットし、is_active = false にする
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  const { tenantId } = await ctx.params;

  try {
    // テナント存在確認
    const { data: existing } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug")
      .eq("id", tenantId)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    // ソフトデリート
    const now = new Date().toISOString();
    const { error: deleteErr } = await supabaseAdmin
      .from("tenants")
      .update({
        is_active: false,
        deleted_at: now,
        updated_at: now,
      })
      .eq("id", tenantId);

    if (deleteErr) {
      console.error("[platform/tenants/[id]] DELETE error:", deleteErr);
      return NextResponse.json(
        { ok: false, error: "テナントの削除に失敗しました" },
        { status: 500 },
      );
    }

    // テナントに属するメンバーも無効化
    await supabaseAdmin
      .from("admin_users")
      .update({ is_active: false })
      .eq("tenant_id", tenantId);

    // 監査ログ（fire-and-forget）
    logAudit(req, "delete_tenant", "tenant", tenantId, {
      name: existing.name,
      slug: existing.slug,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[platform/tenants/[id]] DELETE unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
