// app/api/platform/tenants/[tenantId]/members/route.ts
// テナントメンバー一覧取得・メンバー追加API

import { NextRequest, NextResponse } from "next/server";
import { conflict, forbidden, notFound, serverError } from "@/lib/api-error";
import bcrypt from "bcryptjs";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { addMemberSchema } from "@/lib/validations/platform-tenant";
import { generateUsername } from "@/lib/username";
import { sendTenantInviteEmail } from "@/lib/email";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET: テナントのメンバー一覧
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return forbidden("権限がありません");

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
      return notFound("テナントが見つかりません");
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
          username,
          platform_role,
          is_active,
          created_at
        )
      `,
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[platform/tenants/[id]/members] GET error:", error);
      return serverError("メンバー一覧の取得に失敗しました");
    }

    return NextResponse.json({ ok: true, members: members || [] });
  } catch (err) {
    console.error("[platform/tenants/[id]/members] GET unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}

/**
 * POST: テナントにメンバーを追加
 * admin_users INSERT → tenant_members INSERT
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return forbidden("権限がありません");

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
      return notFound("テナントが見つかりません");
    }

    // メールアドレス重複チェック
    const { data: existingUser } = await supabaseAdmin
      .from("admin_users")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (existingUser) {
      return conflict("このメールアドレスは既に使用されています");
    }

    // admin_users 作成（ユーザーID自動生成）
    const passwordHash = await bcrypt.hash(data.password, 12);
    const username = await generateUsername();
    const { data: newUser, error: userErr } = await supabaseAdmin
      .from("admin_users")
      .insert({
        tenant_id: tenantId,
        name: data.name,
        email: data.email,
        username,
        password_hash: passwordHash,
        platform_role: "tenant_admin",
        is_active: true,
      })
      .select("id, username")
      .single();

    if (userErr || !newUser) {
      console.error(
        "[platform/tenants/[id]/members] INSERT admin_user error:",
        userErr,
      );
      return serverError("ユーザーの作成に失敗しました");
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
      return serverError("メンバーの追加に失敗しました");
    }

    // 監査ログ（fire-and-forget）
    logAudit(req, "add_member", "tenant_member", member?.id || "", {
      tenantId,
      tenantName: tenant.name,
      memberName: data.name,
      memberEmail: data.email,
      role: data.role,
    });

    // テナント招待メール送信（fire-and-forget）
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://l-ope.jp"}/setup?token=${newUser.id}`;
    sendTenantInviteEmail(
      data.email,
      admin.name || "プラットフォーム管理者",
      tenant.name,
      inviteUrl,
      data.role,
    ).catch((err) => {
      console.error("[platform/tenants/[id]/members] 招待メール送信エラー:", err);
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
            username: newUser.username,
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
    return serverError("予期しないエラーが発生しました");
  }
}
