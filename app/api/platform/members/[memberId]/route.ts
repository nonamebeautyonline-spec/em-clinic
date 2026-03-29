// app/api/platform/members/[memberId]/route.ts
// プラットフォーム横断メンバー操作API（有効/無効、ロール変更、強制ログアウト、2FAリセット）

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { revokeAllSessions } from "@/lib/session";

interface RouteContext {
  params: Promise<{ memberId: string }>;
}

/**
 * GET: メンバー詳細取得
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { memberId } = await ctx.params;

  try {
    const { data: user, error } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, name, is_active, platform_role, tenant_id, totp_enabled, created_at, updated_at")
      .eq("id", memberId)
      .single();

    if (error || !user) {
      return notFound("メンバーが見つかりません");
    }

    // テナント情報
    let tenantName = null;
    if (user.tenant_id) {
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("name")
        .eq("id", user.tenant_id)
        .single();
      tenantName = tenant?.name || null;
    }

    // セッション数
    const { count: sessionCount } = await supabaseAdmin
      .from("admin_sessions")
      .select("id", { count: "exact", head: true })
      .eq("admin_user_id", memberId)
      .gt("expires_at", new Date().toISOString());

    return NextResponse.json({
      ok: true,
      member: {
        ...user,
        tenantName,
        activeSessions: sessionCount || 0,
      },
    });
  } catch (err) {
    console.error("[platform/members/[id]] GET error:", err);
    return serverError("メンバー情報の取得に失敗しました");
  }
}

/**
 * PATCH: メンバー属性の更新
 * - action: "toggle_active" | "change_role" | "force_logout" | "reset_2fa"
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { memberId } = await ctx.params;

  let body: { action: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  const { action } = body;

  // 自分自身の無効化・ログアウトを防止
  if (memberId === admin.userId && (action === "toggle_active" || action === "force_logout")) {
    return badRequest("自分自身に対してこの操作はできません");
  }

  try {
    // メンバー存在確認
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from("admin_users")
      .select("id, name, email, is_active, platform_role, totp_enabled")
      .eq("id", memberId)
      .single();

    if (fetchErr || !user) {
      return notFound("メンバーが見つかりません");
    }

    switch (action) {
      case "toggle_active": {
        const newStatus = !user.is_active;
        const { error: updateErr } = await supabaseAdmin
          .from("admin_users")
          .update({ is_active: newStatus })
          .eq("id", memberId);

        if (updateErr) {
          return serverError("ステータスの変更に失敗しました");
        }

        // 無効化時はセッションも全削除
        if (!newStatus) {
          await revokeAllSessions(memberId);
        }

        logAudit(req, newStatus ? "platform.member.activate" : "platform.member.deactivate", "admin_user", memberId, {
          memberName: user.name,
          memberEmail: user.email,
        });

        return NextResponse.json({ ok: true, isActive: newStatus });
      }

      case "change_role": {
        const { role } = body;
        if (!role || !["platform_admin", "tenant_admin"].includes(role)) {
          return badRequest("有効なロールを指定してください");
        }

        // 自分自身のロール降格を防止
        if (memberId === admin.userId && role !== "platform_admin") {
          return badRequest("自分自身のプラットフォーム管理者権限は変更できません");
        }

        const { error: updateErr } = await supabaseAdmin
          .from("admin_users")
          .update({ platform_role: role })
          .eq("id", memberId);

        if (updateErr) {
          return serverError("ロールの変更に失敗しました");
        }

        logAudit(req, "platform.member.change_role", "admin_user", memberId, {
          memberName: user.name,
          oldRole: user.platform_role,
          newRole: role,
        });

        return NextResponse.json({ ok: true, role });
      }

      case "force_logout": {
        await revokeAllSessions(memberId);

        logAudit(req, "platform.member.force_logout", "admin_user", memberId, {
          memberName: user.name,
          memberEmail: user.email,
        });

        return NextResponse.json({ ok: true });
      }

      case "reset_2fa": {
        const { error: updateErr } = await supabaseAdmin
          .from("admin_users")
          .update({
            totp_enabled: false,
            totp_secret: null,
            totp_backup_codes: null,
          })
          .eq("id", memberId);

        if (updateErr) {
          return serverError("2FAのリセットに失敗しました");
        }

        logAudit(req, "platform.member.reset_2fa", "admin_user", memberId, {
          memberName: user.name,
          memberEmail: user.email,
        });

        return NextResponse.json({ ok: true });
      }

      default:
        return badRequest("不明なアクションです");
    }
  } catch (err) {
    console.error("[platform/members/[id]] PATCH error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
