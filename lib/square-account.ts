// lib/square-account.ts — Squareアカウントの型定義・定数（クライアント安全）

export interface SquareAccount {
  id: string;
  name: string;
  access_token: string;
  application_id: string;
  location_id: string;
  webhook_signature_key: string;
  env: string;
  three_ds_enabled: boolean;
  // OAuth関連
  oauth_connected?: boolean;
  refresh_token?: string;
  token_expires_at?: string;
  merchant_id?: string;
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
    oauth_connected: false,
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
