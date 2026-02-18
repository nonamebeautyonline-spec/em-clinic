// app/api/admin/platform/tenants/[tenantId]/members/[memberId]/route.ts
// メンバー個別のロール変更・削除API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { updateMemberRoleSchema } from "@/lib/validations/platform-tenant";

interface RouteContext {
  params: Promise<{ tenantId: string; memberId: string }>;
}

/**
 * PUT: メンバーのロール変更
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

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
      return NextResponse.json(
        { ok: false, error: "メンバーが見つかりません" },
        { status: 404 },
      );
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
      return NextResponse.json(
        { ok: false, error: "ロールの変更に失敗しました" },
        { status: 500 },
      );
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
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}

/**
 * DELETE: メンバーの削除
 * tenant_members 削除 + admin_users 無効化
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

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
      return NextResponse.json(
        { ok: false, error: "メンバーが見つかりません" },
        { status: 404 },
      );
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
        return NextResponse.json(
          { ok: false, error: "オーナーは最低1人必要です" },
          { status: 400 },
        );
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
      return NextResponse.json(
        { ok: false, error: "メンバーの削除に失敗しました" },
        { status: 500 },
      );
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
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
