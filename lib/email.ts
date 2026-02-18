// lib/email.ts
import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@l-ope.jp";
const APP_NAME = process.env.APP_NAME || "Lオペ for CLINIC";

// 遅延初期化（ビルド時エラー回避）
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY not configured");
    return null;
  }
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    if (!resend) {
      return { success: false, error: "メール設定が完了していません" };
    }

    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `【${APP_NAME}】パスワードリセット`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">パスワードリセット</h2>
          <p>下記のリンクからパスワードを再設定してください。</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}"
               style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
              パスワードを再設定する
            </a>
          </p>
          <p style="color: #64748b; font-size: 14px;">
            このリンクは1時間有効です。<br>
            心当たりがない場合は、このメールを無視してください。
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">
            ${APP_NAME}
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[Email] Send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[Email] Unexpected error:", err);
    return { success: false, error: "メール送信に失敗しました" };
  }
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  setupUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    if (!resend) {
      return { success: false, error: "メール設定が完了していません" };
    }

    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `【${APP_NAME}】管理者アカウント作成`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">管理者アカウントが作成されました</h2>
          <p>${name} 様</p>
          <p>のなめビューティー管理画面の管理者アカウントが作成されました。</p>
          <p>下記のリンクからパスワードを設定してください。</p>
          <p style="margin: 24px 0;">
            <a href="${setupUrl}"
               style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
              パスワードを設定する
            </a>
          </p>
          <p style="color: #64748b; font-size: 14px;">
            このリンクは24時間有効です。
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">
            ${APP_NAME}
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[Email] Send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[Email] Unexpected error:", err);
    return { success: false, error: "メール送信に失敗しました" };
  }
}
