// app/api/platform/tenants/[tenantId]/members/[memberId]/route.ts
// メンバー個別のロール変更・削除API

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { updateMemberRoleSchema } from "@/lib/validations/platform-tenant";
import bcrypt from "bcryptjs";

interface RouteContext {
  params: Promise<{ tenantId: string; memberId: string }>;
}

/**
 * PUT: メンバーのロール変更
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return forbidden("権限がありません");

  const { tenantId, memberId } = await ctx.params;

  const parsed = await parseBody(req, updateMemberRoleSchema);
  if (parsed.error) return parsed.error;

  const { role } = parsed.data;

  try {
    // メンバー存在確認
    const { data: member } = await supabaseAdmin
      .from("tenant_members")
      .select(
        `
        id,
        role,
        admin_users (
          id,
          name,
          email
        )
      `,
      )
      .eq("id", memberId)
      .eq("tenant_id", tenantId)
      .single();

    if (!member) {
      return notFound("メンバーが見つかりません");
    }

    // ロール更新
    const { error: updateErr } = await supabaseAdmin
      .from("tenant_members")
      .update({ role })
      .eq("id", memberId);

    if (updateErr) {
      console.error(
        "[platform/tenants/[id]/members/[id]] PUT error:",
        updateErr,
      );
      return serverError("ロールの変更に失敗しました");
    }

    // 監査ログ（fire-and-forget）
    const adminUser = member.admin_users as unknown as {
      id: string;
      name: string;
      email: string;
    };
    logAudit(req, "update_member_role", "tenant_member", memberId, {
      tenantId,
      memberName: adminUser?.name,
      oldRole: member.role,
      newRole: role,
    });

    return NextResponse.json({ ok: true, role });
  } catch (err) {
    console.error(
      "[platform/tenants/[id]/members/[id]] PUT unexpected error:",
      err,
    );
    return serverError("予期しないエラーが発生しました");
  }
}

/**
 * PATCH: メンバーのパスワード強制リセット
 * プラットフォーム管理者がテナント管理者のパスワードをリセットする
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { tenantId, memberId } = await ctx.params;

  let body: { newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  const { newPassword } = body;
  if (!newPassword || newPassword.length < 8) {
    return badRequest("パスワードは8文字以上で指定してください");
  }

  try {
    // メンバー存在確認
    const { data: member } = await supabaseAdmin
      .from("tenant_members")
      .select(
        `
        id,
        admin_user_id,
        admin_users (
          id,
          name,
          email
        )
      `,
      )
      .eq("id", memberId)
      .eq("tenant_id", tenantId)
      .single();

    if (!member || !member.admin_user_id) {
      return notFound("メンバーが見つかりません");
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // パスワード更新
    const { error: updateErr } = await supabaseAdmin
      .from("admin_users")
      .update({
        password_hash: passwordHash,
        password_changed_at: new Date().toISOString(),
      })
      .eq("id", member.admin_user_id);

    if (updateErr) {
      console.error(
        "[platform/tenants/[id]/members/[id]] PATCH password error:",
        updateErr,
      );
      return serverError("パスワードのリセットに失敗しました");
    }

    // パスワード履歴に保存
    await supabaseAdmin.from("password_history").insert({
      id: crypto.randomUUID(),
      admin_user_id: member.admin_user_id,
      password_hash: passwordHash,
    });

    // 監査ログ
    const adminUser = member.admin_users as unknown as {
      id: string;
      name: string;
      email: string;
    };
    logAudit(req, "platform.password_reset.force", "admin_user", member.admin_user_id, {
      tenantId,
      memberName: adminUser?.name,
      memberEmail: adminUser?.email,
      resetBy: admin.name,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      "[platform/tenants/[id]/members/[id]] PATCH unexpected error:",
      err,
    );
    return serverError("予期しないエラーが発生しました");
  }
}

/**
 * DELETE: メンバーの削除
 * tenant_members 削除 + admin_users 無効化
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return forbidden("権限がありません");

  const { tenantId, memberId } = await ctx.params;

  try {
    // メンバー存在確認
    const { data: member } = await supabaseAdmin
      .from("tenant_members")
      .select(
        `
        id,
        role,
        admin_user_id,
        admin_users (
          id,
          name,
          email
        )
      `,
      )
      .eq("id", memberId)
      .eq("tenant_id", tenantId)
      .single();

    if (!member) {
      return notFound("メンバーが見つかりません");
    }

    // オーナーは最低1人必要（他にオーナーがいるかチェック）
    if (member.role === "owner") {
      const { count } = await supabaseAdmin
        .from("tenant_members")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("role", "owner")
        .neq("id", memberId);

      if ((count || 0) < 1) {
        return badRequest("オーナーは最低1人必要です");
      }
    }

    // tenant_members 削除
    const { error: deleteErr } = await supabaseAdmin
      .from("tenant_members")
      .delete()
      .eq("id", memberId);

    if (deleteErr) {
      console.error(
        "[platform/tenants/[id]/members/[id]] DELETE error:",
        deleteErr,
      );
      return serverError("メンバーの削除に失敗しました");
    }

    // admin_users を無効化（物理削除はしない）
    if (member.admin_user_id) {
      await supabaseAdmin
        .from("admin_users")
        .update({ is_active: false })
        .eq("id", member.admin_user_id);
    }

    // 監査ログ（fire-and-forget）
    const adminUser = member.admin_users as unknown as {
      id: string;
      name: string;
      email: string;
    };
    logAudit(req, "remove_member", "tenant_member", memberId, {
      tenantId,
      memberName: adminUser?.name,
      memberEmail: adminUser?.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      "[platform/tenants/[id]/members/[id]] DELETE unexpected error:",
      err,
    );
    return serverError("予期しないエラーが発生しました");
  }
}
