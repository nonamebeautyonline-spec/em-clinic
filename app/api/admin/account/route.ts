// app/api/admin/account/route.ts
// アカウント管理API（パスワード変更・メールアドレス変更）
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth, getAdminUserId } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import bcrypt from "bcryptjs";

/**
 * PUT: パスワード変更
 * body: { currentPassword, newPassword }
 */
export async function PUT(req: NextRequest) {
  if (!(await verifyAdminAuth(req))) {
    return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  }

  const userId = await getAdminUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "ユーザー情報を取得できません" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ ok: false, error: "現在のパスワードと新しいパスワードを入力してください" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ ok: false, error: "パスワードは8文字以上で入力してください" }, { status: 400 });
    }

    // 現在のパスワードハッシュを取得
    const { data: user, error: fetchError } = await withTenant(
      supabaseAdmin.from("admin_users").select("password_hash"), tenantId
    ).eq("id", userId).single();

    if (fetchError || !user) {
      return NextResponse.json({ ok: false, error: "ユーザーが見つかりません" }, { status: 404 });
    }

    // 現在のパスワードを検証
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ ok: false, error: "現在のパスワードが正しくありません" }, { status: 400 });
    }

    // 新しいパスワードをハッシュ化して更新
    const newHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await withTenant(
      supabaseAdmin.from("admin_users").update({ password_hash: newHash }), tenantId
    ).eq("id", userId);

    if (updateError) {
      console.error("[Account] パスワード更新エラー:", updateError);
      return NextResponse.json({ ok: false, error: "パスワードの更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "パスワードを変更しました" });
  } catch (err) {
    console.error("[Account] PUT エラー:", err);
    return NextResponse.json({ ok: false, error: "サーバーエラー" }, { status: 500 });
  }
}

/**
 * PATCH: メールアドレス変更
 * body: { newEmail, password }
 */
export async function PATCH(req: NextRequest) {
  if (!(await verifyAdminAuth(req))) {
    return NextResponse.json({ ok: false, error: "認証が必要です" }, { status: 401 });
  }

  const userId = await getAdminUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "ユーザー情報を取得できません" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  try {
    const { newEmail, password } = await req.json();

    if (!newEmail || !password) {
      return NextResponse.json({ ok: false, error: "新しいメールアドレスとパスワードを入力してください" }, { status: 400 });
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ ok: false, error: "有効なメールアドレスを入力してください" }, { status: 400 });
    }

    // パスワード検証
    const { data: user, error: fetchError } = await withTenant(
      supabaseAdmin.from("admin_users").select("password_hash, tenant_id"), tenantId
    ).eq("id", userId).single();

    if (fetchError || !user) {
      return NextResponse.json({ ok: false, error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ ok: false, error: "パスワードが正しくありません" }, { status: 400 });
    }

    // 同じテナント内でメールアドレスの重複チェック
    const { data: existing } = await withTenant(
      supabaseAdmin.from("admin_users").select("id"), tenantId
    ).eq("email", newEmail).neq("id", userId).maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: false, error: "このメールアドレスは既に使用されています" }, { status: 409 });
    }

    // メールアドレス更新
    const { error: updateError } = await withTenant(
      supabaseAdmin.from("admin_users").update({ email: newEmail }), tenantId
    ).eq("id", userId);

    if (updateError) {
      console.error("[Account] メール更新エラー:", updateError);
      return NextResponse.json({ ok: false, error: "メールアドレスの更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "メールアドレスを変更しました。次回ログイン時から新しいメールアドレスを使用してください" });
  } catch (err) {
    console.error("[Account] PATCH エラー:", err);
    return NextResponse.json({ ok: false, error: "サーバーエラー" }, { status: 500 });
  }
}
