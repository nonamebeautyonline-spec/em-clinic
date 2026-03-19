// lib/square-account-server.ts — Squareアカウントのサーバー専用ロジック
import { getSetting, getSettingOrEnv, setSetting } from "@/lib/settings";
import type { SquareAccount, SquareConfig } from "@/lib/square-account";

/**
 * OAuthアカウントのトークンが期限切れに近い場合にリフレッシュを試行
 * Cronが間に合わなかった場合のセーフティネット
 */
async function tryRefreshIfNeeded(
  active: SquareAccount,
  accounts: SquareAccount[],
  tenantId?: string,
): Promise<void> {
  if (!active.oauth_connected || !active.refresh_token || !active.token_expires_at) return;

  const expiresAt = new Date(active.token_expires_at);
  const now = new Date();
  // 期限切れ or 3日以内ならリフレッシュ
  if (expiresAt.getTime() - now.getTime() > 3 * 24 * 60 * 60 * 1000) return;

  try {
    const { refreshSquareToken } = await import("@/lib/square-oauth");
    const tokenResponse = await refreshSquareToken(active.refresh_token);
    active.access_token = tokenResponse.access_token;
    active.token_expires_at = tokenResponse.expires_at;
    if (tokenResponse.refresh_token) {
      active.refresh_token = tokenResponse.refresh_token;
    }
    await setSetting("square", "accounts", JSON.stringify(accounts), tenantId);
    console.log(`[square-account] トークン自動リフレッシュ成功: account=${active.id}`);
  } catch (e) {
    console.error(`[square-account] トークン自動リフレッシュ失敗: account=${active.id}`, e);
  }
}

/**
 * アクティブなSquareアカウントの設定を取得する
 * 新形式（accounts JSON）→ 旧形式（個別キー）→ 環境変数の順にフォールバック
 */
export async function getActiveSquareAccount(tenantId?: string): Promise<SquareConfig | undefined> {
  // 新形式: accounts JSON配列から取得
  const accountsJson = await getSetting("square", "accounts", tenantId);
  if (accountsJson) {
    try {
      const accounts: SquareAccount[] = JSON.parse(accountsJson);
      const activeId = await getSetting("square", "active_account_id", tenantId);
      const active = (activeId ? accounts.find((a) => a.id === activeId) : null) || accounts[0];
      if (active) {
        // OAuthトークンの期限チェック＆自動リフレッシュ
        await tryRefreshIfNeeded(active, accounts, tenantId);

        const env = active.env || "production";
        return {
          accessToken: active.access_token,
          applicationId: active.application_id,
          locationId: active.location_id,
          webhookSignatureKey: active.webhook_signature_key,
          env,
          threeDsEnabled: active.three_ds_enabled,
          baseUrl: env === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com",
        };
      }
    } catch {
      // JSONパース失敗 → 旧形式にフォールバック
    }
  }

  // 旧形式: 個別キーから取得
  const accessToken = await getSettingOrEnv("square", "access_token", "SQUARE_ACCESS_TOKEN", tenantId);
  if (!accessToken) return undefined;

  const locationId = await getSettingOrEnv("square", "location_id", "SQUARE_LOCATION_ID", tenantId);
  const env = (await getSettingOrEnv("square", "env", "SQUARE_ENV", tenantId)) || "production";
  const webhookSignatureKey = await getSettingOrEnv("square", "webhook_signature_key", "SQUARE_WEBHOOK_SIGNATURE_KEY", tenantId);
  const applicationId = await getSettingOrEnv("square", "application_id", "SQUARE_APPLICATION_ID", tenantId);
  const threeDsRaw = await getSetting("square", "3ds_enabled", tenantId);

  return {
    accessToken,
    applicationId: applicationId || "",
    locationId: locationId || "",
    webhookSignatureKey: webhookSignatureKey || "",
    env,
    threeDsEnabled: threeDsRaw === "true",
    baseUrl: env === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com",
  };
}
