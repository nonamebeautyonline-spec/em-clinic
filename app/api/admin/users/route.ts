// app/api/admin/users/route.ts
// 管理者ユーザー作成・一覧API
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { sendWelcomeEmail } from "@/lib/email";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { generateUsername } from "@/lib/username";
import { parseBody } from "@/lib/validations/helpers";
import { createAdminUserSchema } from "@/lib/validations/admin-operations";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_BASE_URL = process.env.APP_BASE_URL || "https://noname-beauty.l-ope.jp";

/**
 * GET: 管理者一覧
 */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  const { data: users, error } = await withTenant(
    supabase
      .from("admin_users")
      .select("id, email, name, username, is_active, created_at, updated_at")
      .order("created_at", { ascending: true }),
    tenantId
  );

  if (error) {
    console.error("[Admin Users] List error:", error);
    return NextResponse.json({ ok: false, error: "database_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, users });
}

/**
 * POST: 管理者作成（招待メール送信）
 */
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  try {
    const parsed = await parseBody(req, createAdminUserSchema);
    if ("error" in parsed) return parsed.error;
    const { email, name } = parsed.data;

    // メールアドレス重複チェック
    const { data: existing } = await withTenant(
      supabase
        .from("admin_users")
        .select("id")
        .eq("email", email),
      tenantId
    ).single();

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "このメールアドレスは既に登録されています" },
        { status: 400 }
      );
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
      return NextResponse.json({ ok: false, error: "作成に失敗しました" }, { status: 500 });
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
    const setupUrl = `${APP_BASE_URL}/admin/setup?token=${setupToken}`;
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

    return NextResponse.json({
      ok: true,
      user: newUser,
      message: "招待メールを送信しました",
    });
  } catch (err) {
    console.error("[Admin Users] Error:", err);
    return NextResponse.json({ ok: false, error: "サーバーエラー" }, { status: 500 });
  }
}

/**
 * DELETE: 管理者削除
 */
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  }

  const { error } = await withTenant(
    supabase
      .from("admin_users")
      .delete()
      .eq("id", userId),
    tenantId
  );

  if (error) {
    console.error("[Admin Users] Delete error:", error);
    return NextResponse.json({ ok: false, error: "削除に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
