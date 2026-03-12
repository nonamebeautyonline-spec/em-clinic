// lib/email.ts — Resend APIメール送信ラッパー
import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@l-ope.jp";
const APP_NAME = process.env.APP_NAME || "Lオペ for CLINIC";
const FROM_ADDRESS = `Lオペ <${FROM_EMAIL}>`;

// 遅延初期化（ビルド時エラー回避）
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY not configured");
    return null;
  }
  return new Resend(apiKey);
}

/**
 * 汎用メール送信（Resend API経由）
 * エラー時はログ出力後に例外を投げる
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    throw new Error("メール設定が完了していません（RESEND_API_KEY未設定）");
  }

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[email] Resend APIエラー:", error);
    throw new Error(`メール送信に失敗しました: ${error.message}`);
  }
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
  setupUrl: string,
  tenantName?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    if (!resend) {
      return { success: false, error: "メール設定が完了していません" };
    }

    const displayName = tenantName || "Lオペ for CLINIC";

    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `【${APP_NAME}】管理者アカウント作成`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">管理者アカウントが作成されました</h2>
          <p>${name} 様</p>
          <p>${displayName}管理画面の管理者アカウントが作成されました。</p>
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

/**
 * テナント招待メール送信
 */
export async function sendTenantInviteEmail(
  to: string,
  inviterName: string,
  tenantName: string,
  inviteUrl: string,
  role: string,
): Promise<void> {
  const roleLabel = role === "owner" ? "オーナー" : role === "admin" ? "管理者" : "メンバー";

  await sendEmail({
    to,
    subject: `【${APP_NAME}】${tenantName}への招待`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">${tenantName}に招待されました</h2>
        <p>${inviterName} さんから、${tenantName}の${roleLabel}として招待されました。</p>
        <p>下記のリンクから参加してください。</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
            招待を承認する
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px;">
          このリンクは7日間有効です。<br>
          心当たりがない場合は、このメールを無視してください。
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">
          ${APP_NAME}
        </p>
      </div>
    `,
  });
}

/**
 * 請求通知メール送信
 */
export async function sendInvoiceNotificationEmail(
  to: string,
  tenantName: string,
  amount: number,
  billingPeriod: string,
): Promise<void> {
  const formattedAmount = new Intl.NumberFormat("ja-JP").format(amount);

  await sendEmail({
    to,
    subject: `【${APP_NAME}】${tenantName}の請求書が発行されました`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">請求書のお知らせ</h2>
        <p>${tenantName} 様</p>
        <p>以下の内容で請求書が発行されました。</p>
        <div style="margin: 24px 0; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">請求期間</p>
          <p style="margin: 0 0 16px 0; font-weight: bold; color: #1e293b;">${billingPeriod}</p>
          <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">請求金額</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1e293b;">&yen;${formattedAmount}</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          詳細は管理画面の請求書ページからご確認ください。
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">
          ${APP_NAME}
        </p>
      </div>
    `,
  });
}

/**
 * テナント開設メール送信（初期設定案内 + ログイン情報）
 */
export async function sendTenantSetupEmail({
  to,
  adminName,
  tenantName,
  slug,
  username,
}: {
  to: string;
  adminName: string;
  tenantName: string;
  slug: string;
  username: string;
}): Promise<void> {
  const adminUrl = `https://${slug}.l-ope.jp/admin`;

  await sendEmail({
    to,
    subject: `【${APP_NAME}】テナント開設のお知らせ — ログイン情報`,
    html: `
      <div style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e293b; font-size: 22px; margin: 0;">${APP_NAME}</h1>
          <p style="color: #64748b; font-size: 14px; margin: 8px 0 0;">テナント開設のお知らせ</p>
        </div>

        <p style="color: #334155; font-size: 15px;">${adminName} 様</p>
        <p style="color: #334155; font-size: 15px;">
          この度は ${APP_NAME} をお申し込みいただき、誠にありがとうございます。<br>
          <strong>${tenantName}</strong> の管理画面をご用意いたしました。
        </p>

        <div style="margin: 28px 0; padding: 20px; background-color: #eff6ff; border-radius: 10px; border: 1px solid #bfdbfe;">
          <h2 style="color: #1e40af; font-size: 16px; margin: 0 0 16px;">ログイン情報</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px; vertical-align: top;">管理画面URL</td>
              <td style="padding: 8px 0;">
                <a href="${adminUrl}" style="color: #2563eb; font-size: 14px; font-family: monospace; word-break: break-all;">${adminUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px; vertical-align: top;">ユーザーID</td>
              <td style="padding: 8px 0;">
                <code style="background: #fff; padding: 4px 10px; border-radius: 4px; border: 1px solid #bfdbfe; font-size: 15px; font-weight: bold; color: #1e293b;">${username}</code>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px; vertical-align: top;">パスワード</td>
              <td style="padding: 8px 0; color: #334155; font-size: 14px;">お申し込み時に設定いただいたパスワード</td>
            </tr>
          </table>
        </div>

        <div style="margin: 24px 0; padding: 16px; background-color: #fefce8; border-radius: 8px; border: 1px solid #fde68a;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            ユーザーIDは大切に保管してください。紛失された場合はサポートまでお問い合わせください。
          </p>
        </div>

        <h3 style="color: #1e293b; font-size: 15px; margin: 28px 0 12px;">ご利用開始までの流れ</h3>
        <ol style="color: #475569; font-size: 14px; line-height: 1.8; padding-left: 20px;">
          <li>上記URLから管理画面にログイン</li>
          <li>LINE公式アカウントの連携設定</li>
          <li>リッチメニュー・問診フォームの設定</li>
          <li>患者様へのLINE友だち追加案内を開始</li>
        </ol>

        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
          ご不明な点がございましたら、お気軽にお問い合わせください。<br>
          サポート: <a href="mailto:info@l-ope.jp" style="color: #2563eb;">info@l-ope.jp</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">
          ${APP_NAME} — クリニック特化LINE運用プラットフォーム
        </p>
      </div>
    `,
  });
}

/**
 * 使用量警告メール送信
 */
export async function sendUsageWarningEmail(
  to: string,
  tenantName: string,
  usagePercent: number,
  currentCount: number,
  quota: number,
): Promise<void> {
  const formattedCount = new Intl.NumberFormat("ja-JP").format(currentCount);
  const formattedQuota = new Intl.NumberFormat("ja-JP").format(quota);
  const isOverLimit = usagePercent >= 100;
  const statusLabel = isOverLimit ? "上限に到達しました" : `${usagePercent}%に到達しました`;
  const barColor = isOverLimit ? "#ef4444" : "#f59e0b";

  await sendEmail({
    to,
    subject: `【${APP_NAME}】${tenantName}のメッセージ使用量が${statusLabel}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">メッセージ使用量のお知らせ</h2>
        <p>${tenantName} 様</p>
        <p>当月のメッセージ送信数が${statusLabel}</p>
        <div style="margin: 24px 0; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">使用状況</p>
          <p style="margin: 0 0 8px 0; font-size: 20px; font-weight: bold; color: #1e293b;">
            ${formattedCount} / ${formattedQuota} 通 (${usagePercent}%)
          </p>
          <div style="width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden;">
            <div style="width: ${Math.min(usagePercent, 100)}%; height: 100%; background-color: ${barColor}; border-radius: 4px;"></div>
          </div>
        </div>
        ${isOverLimit
          ? `<p style="color: #ef4444; font-weight: bold;">上限を超過した分は従量課金となります。</p>`
          : `<p style="color: #64748b; font-size: 14px;">上限に達すると従量課金が発生します。プランの変更は管理画面から行えます。</p>`
        }
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">
          ${APP_NAME}
        </p>
      </div>
    `,
  });
}
