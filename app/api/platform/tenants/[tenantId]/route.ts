// app/api/platform/tenants/[tenantId]/route.ts
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
    // テナント基本情報（リレーションなし、確実に動作するカラムのみ）
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, industry, is_active, contact_email, contact_phone, address, notes, logo_url, created_at, updated_at, deleted_at")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantErr) {
      console.error("[platform/tenants/[id]] テナント取得エラー:", tenantErr.message);
      // 拡張カラムが未作成の場合のフォールバック
      const { data: basic, error: basicErr } = await supabaseAdmin
        .from("tenants")
        .select("id, name, slug, is_active, created_at, updated_at")
        .eq("id", tenantId)
        .maybeSingle();
      if (basicErr || !basic) {
        return NextResponse.json(
          { ok: false, error: "テナントが見つかりません" },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, tenant: { ...basic, tenant_members: [], tenant_plans: [] } });
    }

    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    // メンバー情報を個別取得（リレーション解決問題を回避）
    let tenantMembers: any[] = [];
    try {
      const { data: members } = await supabaseAdmin
        .from("tenant_members")
        .select("id, role, created_at, admin_user_id")
        .eq("tenant_id", tenantId);
      if (members && members.length > 0) {
        const userIds = members.map((m: any) => m.admin_user_id);
        const { data: users } = await supabaseAdmin
          .from("admin_users")
          .select("id, name, email, platform_role, is_active, created_at")
          .in("id", userIds);
        const userMap = new Map((users || []).map((u: any) => [u.id, u]));
        tenantMembers = members.map((m: any) => ({
          id: m.id,
          role: m.role,
          created_at: m.created_at,
          admin_users: userMap.get(m.admin_user_id) || null,
        }));
      }
    } catch (e) {
      console.error("[platform/tenants/[id]] メンバー取得スキップ:", e);
    }

    // プラン情報を個別取得
    let tenantPlans: any[] = [];
    try {
      const { data: plans } = await supabaseAdmin
        .from("tenant_plans")
        .select("id, plan_name, monthly_fee, setup_fee, started_at, next_billing_at, created_at")
        .eq("tenant_id", tenantId);
      tenantPlans = plans || [];
    } catch (e) {
      console.error("[platform/tenants/[id]] プラン取得スキップ:", e);
    }

    return NextResponse.json({
      ok: true,
      tenant: { ...tenant, tenant_members: tenantMembers, tenant_plans: tenantPlans },
    });
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
    // テナント存在確認（deleted_atカラム未作成時も動作するよう保護）
    let existing: any = null;
    const { data: ex1, error: exErr1 } = await supabaseAdmin
      .from("tenants")
      .select("id, slug")
      .eq("id", tenantId)
      .is("deleted_at", null)
      .single();
    if (exErr1) {
      // deleted_atカラムがない場合のフォールバック
      const { data: ex2 } = await supabaseAdmin
        .from("tenants")
        .select("id, slug")
        .eq("id", tenantId)
        .single();
      existing = ex2;
    } else {
      existing = ex1;
    }

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
        .neq("id", tenantId)
        .maybeSingle();

      if (slugExists) {
        return NextResponse.json(
          { ok: false, error: "このスラグは既に使用されています" },
          { status: 409 },
        );
      }
    }

    // 更新データを構築（基本カラムのみ最初に試行、失敗時は拡張カラムを除外）
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
    if (data.industry !== undefined) updatePayload.industry = data.industry;

    let { data: updated, error: updateErr } = await supabaseAdmin
      .from("tenants")
      .update(updatePayload)
      .eq("id", tenantId)
      .select("id, name, slug, is_active, updated_at")
      .single();

    // フォールバック: 拡張カラム（industry等）が未作成の場合
    if (updateErr) {
      console.error("[platform/tenants/[id]] PUT フルペイロード失敗:", updateErr.message);
      const basicPayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) basicPayload.name = data.name;
      if (data.slug !== undefined) basicPayload.slug = data.slug;
      const result = await supabaseAdmin
        .from("tenants")
        .update(basicPayload)
        .eq("id", tenantId)
        .select("id, name, slug, is_active, updated_at")
        .single();
      updated = result.data;
      updateErr = result.error;
    }

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
