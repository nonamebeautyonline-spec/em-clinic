// app/api/admin/password-reset/request/route.ts
// パスワードリセット要求（メール送信）
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { parseBody } from "@/lib/validations/helpers";
import { adminPasswordResetRequestSchema } from "@/lib/validations/admin-operations";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_BASE_URL = process.env.APP_BASE_URL || "https://noname-beauty.l-ope.jp";

export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);

    const parsed = await parseBody(req, adminPasswordResetRequestSchema);
    if ("error" in parsed) return parsed.error;
    const { email } = parsed.data;

    // レート制限: 同一メール 10分に1回
    const emailNorm = email.toLowerCase().trim();
    const limit = await checkRateLimit(`pw-reset:${emailNorm}`, 1, 600);
    if (limit.limited) {
      // セキュリティ上、制限時も同じ成功メッセージを返す
      return NextResponse.json({
        ok: true,
        message: "登録されているメールアドレスの場合、リセット用のメールを送信しました",
      });
    }

    // ユーザー存在チェック
    const { data: user } = await withTenant(
      supabase
        .from("admin_users")
        .select("id, email, name, is_active")
        .eq("email", email)
        .single(),
      tenantId
    );

    // ユーザーが存在しない場合も同じレスポンス（セキュリティ）
    if (!user || !user.is_active) {
      return NextResponse.json({
        ok: true,
        message: "登録されているメールアドレスの場合、リセット用のメールを送信しました",
      });
    }

    // 既存のトークンを無効化（古いものを削除）
    await withTenant(
      supabase
        .from("password_reset_tokens")
        .delete()
        .eq("admin_user_id", user.id)
        .is("used_at", null),
      tenantId
    );

    // 新しいリセットトークン生成（1時間有効）
    const resetToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間

    const { error: tokenError } = await supabase
      .from("password_reset_tokens")
      .insert({
        ...tenantPayload(tenantId),
        admin_user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error("[Password Reset] Token insert error:", tokenError);
      return NextResponse.json(
        { ok: false, error: "処理に失敗しました" },
        { status: 500 }
      );
    }

    // リセットメール送信
    const resetUrl = `${APP_BASE_URL}/admin/reset-password?token=${resetToken}`;
    const emailResult = await sendPasswordResetEmail(email, resetUrl);

    if (!emailResult.success) {
      console.error("[Password Reset] Email send failed:", emailResult.error);
      return NextResponse.json(
        { ok: false, error: "メール送信に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "登録されているメールアドレスの場合、リセット用のメールを送信しました",
    });
  } catch (err) {
    console.error("[Password Reset Request] Error:", err);
    return NextResponse.json(
      { ok: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
