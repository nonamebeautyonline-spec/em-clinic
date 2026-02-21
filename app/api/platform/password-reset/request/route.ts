// app/api/platform/password-reset/request/route.ts — パスワードリセットメール送信API
// 未認証ユーザーが使用するため verifyPlatformAdmin は不要
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { parseBody } from "@/lib/validations/helpers";
import { passwordResetRequestSchema } from "@/lib/validations/platform-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

// トークン有効期限: 30分
const TOKEN_EXPIRES_MINUTES = 30;

export async function POST(req: NextRequest) {
  try {
    // Zodバリデーション
    const parsed = await parseBody(req, passwordResetRequestSchema);
    if (parsed.error) return parsed.error;
    const { email } = parsed.data;

    const emailNorm = email.toLowerCase().trim();

    // レート制限: 同一メールアドレスに対して3回/1時間
    const rateResult = await checkRateLimit(`pw-reset:email:${emailNorm}`, 3, 3600);
    if (rateResult.limited) {
      return NextResponse.json(
        { ok: false, error: "リセットリクエストの回数上限に達しました。しばらくお待ちください。" },
        { status: 429 },
      );
    }

    // admin_usersからplatform_adminかつアクティブなユーザーを検索
    const { data: user } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, name")
      .eq("email", emailNorm)
      .eq("platform_role", "platform_admin")
      .eq("is_active", true)
      .maybeSingle();

    // ユーザーが見つからなくても成功レスポンスを返す（メール列挙攻撃防止）
    if (!user) {
      return NextResponse.json({ ok: true, message: "メールを送信しました" });
    }

    // ランダムトークン生成
    const rawToken = crypto.randomBytes(32).toString("hex");
    // bcryptでハッシュ化してDBに保存
    const tokenHash = await bcrypt.hash(rawToken, 10);

    const expiresAt = new Date(Date.now() + TOKEN_EXPIRES_MINUTES * 60 * 1000).toISOString();

    // password_reset_tokens にINSERT
    const { error: insertError } = await supabaseAdmin
      .from("password_reset_tokens")
      .insert({
        admin_user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("[password-reset/request] トークン保存エラー:", insertError);
      return NextResponse.json(
        { ok: false, error: "サーバーエラーが発生しました" },
        { status: 500 },
      );
    }

    // リセットURL生成
    const resetUrl = `https://admin.l-ope.jp/platform/password-reset/confirm?token=${rawToken}`;

    // メール送信
    try {
      await sendEmail({
        to: user.email,
        subject: "【Lオペ】パスワードリセット",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e293b;">パスワードリセット</h2>
            <p>${user.name || ""} 様</p>
            <p>パスワードリセットのリクエストを受け付けました。</p>
            <p>下記のリンクから新しいパスワードを設定してください。</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}"
                 style="display: inline-block; padding: 12px 24px; background-color: #d97706; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                パスワードを再設定する
              </a>
            </p>
            <p style="color: #64748b; font-size: 14px;">
              このリンクは${TOKEN_EXPIRES_MINUTES}分間有効です。<br>
              心当たりがない場合は、このメールを無視してください。
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px;">
              Lオペ for CLINIC
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[password-reset/request] メール送信失敗:", emailErr);
      // メール送信失敗でもユーザーには成功を返す（内部的にはログに記録）
    }

    // 監査ログ
    logAudit(req, "platform.password_reset.request", "admin_user", user.id, {
      email: emailNorm,
    });

    return NextResponse.json({ ok: true, message: "メールを送信しました" });
  } catch (err) {
    console.error("[password-reset/request] エラー:", err);
    return NextResponse.json(
      { ok: false, error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
