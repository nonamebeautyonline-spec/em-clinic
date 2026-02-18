// app/api/admin/platform/tenants/[tenantId]/members/route.ts
// テナントメンバー一覧取得・メンバー追加API

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { addMemberSchema } from "@/lib/validations/platform-tenant";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET: テナントのメンバー一覧
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
    // テナント存在確認
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("id", tenantId)
      .is("deleted_at", null)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    // メンバー一覧（admin_users を JOIN）
    const { data: members, error } = await supabaseAdmin
      .from("tenant_members")
      .select(
        `
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
      `,
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[platform/tenants/[id]/members] GET error:", error);
      return NextResponse.json(
        { ok: false, error: "メンバー一覧の取得に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, members: members || [] });
  } catch (err) {
    console.error("[platform/tenants/[id]/members] GET unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}

/**
 * POST: テナントにメンバーを追加
 * admin_users INSERT → tenant_members INSERT
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  const { tenantId } = await ctx.params;

  const parsed = await parseBody(req, addMemberSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;

  try {
    // テナント存在確認
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, name")
      .eq("id", tenantId)
      .is("deleted_at", null)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    // メールアドレス重複チェック
    const { data: existingUser } = await supabaseAdmin
      .from("admin_users")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "このメールアドレスは既に使用されています" },
        { status: 409 },
      );
    }

    // admin_users 作成
    const passwordHash = await bcrypt.hash(data.password, 12);
    const { data: newUser, error: userErr } = await supabaseAdmin
      .from("admin_users")
      .insert({
        tenant_id: tenantId,
        name: data.name,
        email: data.email,
        password_hash: passwordHash,
        platform_role: "tenant_admin",
        is_active: true,
      })
      .select("id")
      .single();

    if (userErr || !newUser) {
      console.error(
        "[platform/tenants/[id]/members] INSERT admin_user error:",
        userErr,
      );
      return NextResponse.json(
        { ok: false, error: "ユーザーの作成に失敗しました" },
        { status: 500 },
      );
    }

    // tenant_members 紐付け
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("tenant_members")
      .insert({
        tenant_id: tenantId,
        admin_user_id: newUser.id,
        role: data.role,
      })
      .select("id, role, created_at")
      .single();

    if (memberErr) {
      console.error(
        "[platform/tenants/[id]/members] INSERT tenant_member error:",
        memberErr,
      );
      // ロールバック: ユーザー削除
      await supabaseAdmin.from("admin_users").delete().eq("id", newUser.id);
      return NextResponse.json(
        { ok: false, error: "メンバーの追加に失敗しました" },
        { status: 500 },
      );
    }

    // 監査ログ（fire-and-forget）
    logAudit(req, "add_member", "tenant_member", member?.id || "", {
      tenantId,
      tenantName: tenant.name,
      memberName: data.name,
      memberEmail: data.email,
      role: data.role,
    });

    return NextResponse.json(
      {
        ok: true,
        member: {
          ...member,
          admin_users: {
            id: newUser.id,
            name: data.name,
            email: data.email,
            is_active: true,
          },
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(
      "[platform/tenants/[id]/members] POST unexpected error:",
      err,
    );
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
