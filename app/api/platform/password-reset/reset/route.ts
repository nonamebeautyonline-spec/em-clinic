// app/api/platform/password-reset/reset/route.ts — 新パスワード設定API
// 未認証ユーザーが使用するため verifyPlatformAdmin は不要
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { parseBody } from "@/lib/validations/helpers";
import { passwordResetSchema } from "@/lib/validations/platform-auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    // Zodバリデーション
    const parsed = await parseBody(req, passwordResetSchema);
    if (parsed.error) return parsed.error;
    const { token, password } = parsed.data;

    // 未使用かつ未期限切れのトークンを全取得して照合
    // bcryptハッシュはDB側でWHERE比較できないため、全候補をアプリ側で照合する
    const { data: tokens, error: fetchError } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("id, admin_user_id, token_hash, expires_at, used_at")
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (fetchError) {
      console.error("[password-reset/reset] トークン取得エラー:", fetchError);
      return NextResponse.json(
        { ok: false, error: "サーバーエラーが発生しました" },
        { status: 500 },
      );
    }

    // トークン照合
    let matchedToken: (typeof tokens)[number] | null = null;
    if (tokens) {
      for (const t of tokens) {
        const isMatch = await bcrypt.compare(token, t.token_hash);
        if (isMatch) {
          matchedToken = t;
          break;
        }
      }
    }

    // トークンが見つからない
    if (!matchedToken) {
      return NextResponse.json(
        { ok: false, error: "トークンが無効です" },
        { status: 400 },
      );
    }

    // 使用済みチェック（念のため再確認）
    if (matchedToken.used_at) {
      return NextResponse.json(
        { ok: false, error: "このリセットリンクは使用済みです" },
        { status: 400 },
      );
    }

    // 有効期限チェック
    if (new Date(matchedToken.expires_at) < new Date()) {
      return NextResponse.json(
        { ok: false, error: "トークンの有効期限が切れています" },
        { status: 400 },
      );
    }

    // 新パスワードをbcryptハッシュ化
    const newPasswordHash = await bcrypt.hash(password, 10);

    // admin_users.password_hash を更新
    const { error: updateUserError } = await supabaseAdmin
      .from("admin_users")
      .update({ password_hash: newPasswordHash })
      .eq("id", matchedToken.admin_user_id);

    if (updateUserError) {
      console.error("[password-reset/reset] パスワード更新エラー:", updateUserError);
      return NextResponse.json(
        { ok: false, error: "パスワードの更新に失敗しました" },
        { status: 500 },
      );
    }

    // トークンを使用済みに更新
    const { error: updateTokenError } = await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", matchedToken.id);

    if (updateTokenError) {
      console.error("[password-reset/reset] トークン使用済み更新エラー:", updateTokenError);
      // パスワード自体は更新済みなので、エラーは記録のみ
    }

    // 監査ログ
    logAudit(req, "platform.password_reset.complete", "admin_user", matchedToken.admin_user_id, {
      token_id: matchedToken.id,
    });

    return NextResponse.json({ ok: true, message: "パスワードを変更しました" });
  } catch (err) {
    console.error("[password-reset/reset] エラー:", err);
    return NextResponse.json(
      { ok: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
