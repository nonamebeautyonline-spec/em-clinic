// lib/notifications/login-alert.ts — ログインアラート通知
// 新しいIPアドレスからの管理画面ログイン時にメール通知を送信
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

const APP_NAME = process.env.APP_NAME || "Lオペ for CLINIC";

/**
 * 新しいIPからのログイン時にアラートメールを送信（fire-and-forget）
 *
 * 判定ロジック:
 * - 過去30日のセッションIP一覧と比較
 * - 初回ログイン（過去セッションなし）→ 通知しない
 * - 既知IP → 通知しない
 * - 新規IP → メール送信
 */
export async function sendLoginAlertIfNewIp(params: {
  adminUserId: string;
  email: string;
  name: string;
  ipAddress: string;
  userAgent: string | null;
}): Promise<void> {
  try {
    // 過去30日のセッションから既知IP一覧を取得
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: sessions } = await supabaseAdmin
      .from("admin_sessions")
      .select("ip_address")
      .eq("admin_user_id", params.adminUserId)
      .gte("created_at", thirtyDaysAgo)
      .not("ip_address", "is", null);

    const knownIps = new Set(
      (sessions ?? []).map(
        (s: { ip_address: string }) => s.ip_address,
      ),
    );

    // 初回ログイン or 既知IP → 通知不要
    if (knownIps.size === 0 || knownIps.has(params.ipAddress)) {
      return;
    }

    // 新しいIPからのログイン → メール通知
    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    await sendEmail({
      to: params.email,
      subject: `【${APP_NAME}】新しいIPアドレスからのログイン`,
      html: buildLoginAlertHtml({
        name: params.name,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        loginTime: formattedDate,
      }),
    });
  } catch (err) {
    // fire-and-forget: ログイン処理をブロックしない
    console.error("[login-alert] Failed to send alert:", err);
  }
}

/**
 * ログインアラートメールのHTML生成
 */
function buildLoginAlertHtml(params: {
  name: string;
  ipAddress: string;
  userAgent: string | null;
  loginTime: string;
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e293b;">新しいIPアドレスからのログイン</h2>
      <p>${params.name} 様</p>
      <p>お使いのアカウントに、これまでと異なるIPアドレスからログインがありました。</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">日時</td>
            <td style="padding: 8px 0; font-weight: 600;">${params.loginTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">IPアドレス</td>
            <td style="padding: 8px 0; font-weight: 600;">${params.ipAddress}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ブラウザ</td>
            <td style="padding: 8px 0; font-size: 12px; color: #475569;">${params.userAgent || "不明"}</td>
          </tr>
        </table>
      </div>
      <p style="color: #dc2626; font-weight: 600;">
        心当たりがない場合は、速やかにパスワードを変更してください。
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">
        ${APP_NAME} — このメールはセキュリティ通知です。
      </p>
    </div>
  `;
}
