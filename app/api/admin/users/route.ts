// app/api/admin/users/route.ts
// 管理者ユーザー作成・一覧・ロール変更API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { sendWelcomeEmail } from "@/lib/email";
import { verifyAdminAuth, getAdminTenantRole, getAdminUserId } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { generateUsername } from "@/lib/username";
import { parseBody } from "@/lib/validations/helpers";
import { createAdminUserSchema } from "@/lib/validations/admin-operations";
import { getSettingOrEnv } from "@/lib/settings";
import { isFullAccessRole } from "@/lib/menu-permissions";
import { logAudit } from "@/lib/audit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET: 管理者一覧（tenant_membersからroleをJOIN）
 */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  const { data: users, error } = await strictWithTenant(
    supabase
      .from("admin_users")
      .select("id, email, name, username, is_active, created_at, updated_at, tenant_members!inner(role)")
      .eq("tenant_members.tenant_id", tenantId)
      .order("created_at", { ascending: true }),
    tenantId
  );

  if (error) {
    console.error("[Admin Users] List error:", error);
    return NextResponse.json({ ok: false, error: "database_error" }, { status: 500 });
  }

  // tenant_membersのネストをフラット化してroleフィールドを追加
  const usersWithRole = (users || []).map((u: Record<string, unknown>) => {
    const tenantMembers = u.tenant_members as { role: string }[] | null;
    const role = tenantMembers?.[0]?.role || "viewer";
    const { tenant_members: _, ...rest } = u;
    return { ...rest, role };
  });

  return NextResponse.json({ ok: true, users: usersWithRole });
}

/**
 * POST: 管理者作成（招待メール送信）
 * owner/adminのみ実行可能
 */
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  // owner/adminのみ実行可能
  const callerRole = await getAdminTenantRole(req);
  if (!isFullAccessRole(callerRole)) {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  try {
    const parsed = await parseBody(req, createAdminUserSchema);
    if ("error" in parsed) return parsed.error;
    const { email, name } = parsed.data;
    const role = (parsed.data as Record<string, unknown>).role as string || "viewer";
    // 許可値チェック
    if (role !== "editor" && role !== "viewer") {
      return badRequest("roleはeditorまたはviewerのみ指定可能です");
    }

    // メールアドレス重複チェック
    const { data: existing } = await strictWithTenant(
      supabase
        .from("admin_users")
        .select("id")
        .eq("email", email),
      tenantId
    ).single();

    if (existing) {
      return badRequest("このメールアドレスは既に登録されています");
    }

    // 仮パスワード（ランダム）で作成（後でリセット）
    const tempPasswordHash = randomBytes(32).toString("hex");

    // ユーザー作成（ユーザーID自動生成）
    const username = await generateUsername();
    const { data: newUser, error: insertError } = await supabase
      .from("admin_users")
      .insert({
        ...tenantPayload(tenantId),
        email,
        name,
        username,
        password_hash: tempPasswordHash, // 仮（セットアップ前）
        is_active: true,
      })
      .select("id, email, name, username")
      .single();

    if (insertError) {
      console.error("[Admin Users] Insert error:", insertError);
      return serverError("作成に失敗しました");
    }

    // tenant_membersにロールを登録
    const { error: memberError } = await supabase
      .from("tenant_members")
      .insert({
        admin_user_id: newUser.id,
        tenant_id: tenantId,
        role,
      });

    if (memberError) {
      console.error("[Admin Users] tenant_members insert error:", memberError);
      // ユーザーは作成済みなのでエラーにしない（警告のみ）
    }

    // セットアップトークン作成（24時間有効）
    const setupToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { error: tokenError } = await supabase
      .from("password_reset_tokens")
      .insert({
        ...tenantPayload(tenantId),
        admin_user_id: newUser.id,
        token: setupToken,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error("[Admin Users] Token insert error:", tokenError);
      // ユーザーは作成済みなのでエラーにしない
    }

    // 招待メール送信
    const appBaseUrl = (await getSettingOrEnv("general", "app_base_url", "APP_BASE_URL", tenantId ?? undefined)) || "";
    const setupUrl = `${appBaseUrl}/admin/setup?token=${setupToken}`;
    const emailResult = await sendWelcomeEmail(email, name, setupUrl);

    if (!emailResult.success) {
      console.error("[Admin Users] Email send failed:", emailResult.error);
      // ユーザーは作成済みなので警告のみ
      return NextResponse.json({
        ok: true,
        user: newUser,
        warning: "メール送信に失敗しました。手動でセットアップURLを共有してください。",
        setupUrl,
      });
    }

    logAudit(req, "admin_user.create", "admin_user", String(newUser.id));
    return NextResponse.json({
      ok: true,
      user: newUser,
      message: "招待メールを送信しました",
    });
  } catch (err) {
    console.error("[Admin Users] Error:", err);
    return serverError("サーバーエラー");
  }
}

/**
 * PATCH: ロール変更
 * owner/adminのみ実行可能。ownerへの変更はownerのみ許可。
 */
export async function PATCH(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  // owner/adminのみ実行可能
  const callerRole = await getAdminTenantRole(req);
  if (!isFullAccessRole(callerRole)) {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, role } = body as { userId: string; role: string };

    if (!userId || !role) {
      return badRequest("userId と role は必須です");
    }

    // 許可値チェック
    const allowedRoles = ["admin", "editor", "viewer"];
    if (callerRole === "owner") {
      allowedRoles.push("owner");
    }
    if (!allowedRoles.includes(role)) {
      return badRequest(
        callerRole === "owner"
          ? "roleはowner, admin, editor, viewerのいずれかを指定してください"
          : "roleはadmin, editor, viewerのいずれかを指定してください"
      );
    }

    // ownerへの変更はownerのみ許可
    if (role === "owner" && callerRole !== "owner") {
      return NextResponse.json({ ok: false, error: "ownerへの変更はownerのみ実行できます" }, { status: 403 });
    }

    // 自身をownerから降格させることは禁止（最低1人のowner保護）
    const callerId = await getAdminUserId(req);
    if (callerId === userId && callerRole === "owner" && role !== "owner") {
      return badRequest("自身をownerから降格させることはできません");
    }

    const { error } = await supabase
      .from("tenant_members")
      .update({ role })
      .eq("admin_user_id", userId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("[Admin Users] Role update error:", error);
      return serverError("ロール変更に失敗しました");
    }

    logAudit(req, "admin_user.update", "admin_user", String(userId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Admin Users] PATCH error:", err);
    return serverError("サーバーエラー");
  }
}

/**
 * DELETE: 管理者削除
 */
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return badRequest("id が必要です");
  }

  const { error } = await strictWithTenant(
    supabase
      .from("admin_users")
      .delete()
      .eq("id", userId),
    tenantId
  );

  if (error) {
    console.error("[Admin Users] Delete error:", error);
    return serverError("削除に失敗しました");
  }

  logAudit(req, "admin_user.delete", "admin_user", String(userId));
  return NextResponse.json({ ok: true });
}
