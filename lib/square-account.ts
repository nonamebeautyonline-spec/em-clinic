// lib/square-account.ts — Squareアカウントの型定義・ヘルパー
import { getSetting, getSettingOrEnv } from "@/lib/settings";

export interface SquareAccount {
  id: string;
  name: string;
  access_token: string;
  application_id: string;
  location_id: string;
  webhook_signature_key: string;
  env: string;
  three_ds_enabled: boolean;
}

export const SQUARE_ACCOUNT_FIELDS = [
  { key: "name" as const, label: "アカウント名", placeholder: "例: 本番アカウント", secret: false },
  { key: "access_token" as const, label: "Access Token", placeholder: "EAAAl...", secret: true },
  { key: "application_id" as const, label: "Application ID", placeholder: "sq0idp-...", secret: false },
  { key: "location_id" as const, label: "Location ID", placeholder: "L...", secret: false },
  { key: "webhook_signature_key" as const, label: "Webhook Signature Key", placeholder: "署名検証キー", secret: true },
  { key: "env" as const, label: "環境", placeholder: "production または sandbox", secret: false },
] as const;

export function emptySquareAccount(): SquareAccount {
  return {
    id: `sq_${Date.now()}`,
    name: "",
    access_token: "",
    application_id: "",
    location_id: "",
    webhook_signature_key: "",
    env: "production",
    three_ds_enabled: false,
  };
}

export interface SquareConfig {
  accessToken: string;
  applicationId: string;
  locationId: string;
  webhookSignatureKey: string;
  env: string;
  threeDsEnabled: boolean;
  baseUrl: string;
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
