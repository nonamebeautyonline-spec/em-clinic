// lib/square-oauth.ts — Square OAuth2 認証フローライブラリ
import { getSettingOrEnv } from "@/lib/settings";

const SQUARE_OAUTH_BASE = "https://connect.squareup.com/oauth2/authorize";
const SQUARE_TOKEN_ENDPOINT = "https://connect.squareup.com/oauth2/token";
const SQUARE_REVOKE_ENDPOINT = "https://connect.squareup.com/oauth2/revoke";
const SQUARE_API_BASE = "https://connect.squareup.com";

// --- プラットフォーム設定（DB優先 → 環境変数フォールバック） ---

async function getClientId(): Promise<string> {
  const id = await getSettingOrEnv("square", "oauth_client_id", "SQUARE_OAUTH_CLIENT_ID");
  if (!id) throw new Error("SQUARE_OAUTH_CLIENT_ID が未設定です");
  return id;
}

async function getClientSecret(): Promise<string> {
  const secret = await getSettingOrEnv("square", "oauth_client_secret", "SQUARE_OAUTH_CLIENT_SECRET");
  if (!secret) throw new Error("SQUARE_OAUTH_CLIENT_SECRET が未設定です");
  return secret;
}

async function getRedirectUri(): Promise<string> {
  const uri = await getSettingOrEnv("square", "oauth_redirect_uri", "SQUARE_OAUTH_REDIRECT_URI");
  if (!uri) throw new Error("SQUARE_OAUTH_REDIRECT_URI が未設定です");
  return uri;
}

// --- 型定義 ---

export interface SquareTokenResponse {
  access_token: string;
  token_type: string;
  expires_at: string; // ISO8601形式（Squareは expires_at を返す）
  merchant_id: string;
  refresh_token?: string;
}

export interface SquareLocation {
  id: string;
  name: string;
  status: string; // "ACTIVE" | "INACTIVE"
  address?: {
    address_line_1?: string;
    locality?: string;
    administrative_district_level_1?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface SquareOAuthState {
  tenantId: string;
  ts: number;
}

// --- OAuth2フロー ---

/**
 * OAuth2認可URLを生成
 * @param tenantId テナントID
 * @returns 認可URL
 */
export async function getSquareAuthUrl(tenantId: string): Promise<string> {
  const state = Buffer.from(
    JSON.stringify({ tenantId, ts: Date.now() } satisfies SquareOAuthState)
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: await getClientId(),
    redirect_uri: await getRedirectUri(),
    response_type: "code",
    scope: [
      "PAYMENTS_WRITE",
      "PAYMENTS_READ",
      "ORDERS_READ",
      "ORDERS_WRITE",
      "CUSTOMERS_READ",
      "CUSTOMERS_WRITE",
      "MERCHANT_PROFILE_READ",
      "ITEMS_READ",
    ].join(" "),
    state,
    session: "false",
  });

  return `${SQUARE_OAUTH_BASE}?${params.toString()}`;
}

/**
 * stateパラメータをデコード＋検証
 * @param state base64urlエンコードされたstate
 * @returns デコード結果
 */
export function decodeSquareState(state: string): SquareOAuthState {
  const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as SquareOAuthState;

  if (!decoded.tenantId || !decoded.ts) {
    throw new Error("不正なstateパラメータ");
  }

  // 10分以内のみ有効
  const age = Date.now() - decoded.ts;
  if (age > 10 * 60 * 1000) {
    throw new Error("stateの有効期限切れ（10分超過）");
  }

  return decoded;
}

/**
 * 認証コードをアクセストークンに交換
 * @param code OAuth2認証コード
 * @returns トークンレスポンス
 */
export async function exchangeSquareCode(code: string): Promise<SquareTokenResponse> {
  const [clientId, clientSecret, redirectUri] = await Promise.all([
    getClientId(), getClientSecret(), getRedirectUri(),
  ]);
  const res = await fetch(SQUARE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Square OAuth トークン交換エラー: ${res.status} ${errorBody}`);
  }

  return res.json() as Promise<SquareTokenResponse>;
}

/**
 * リフレッシュトークンでアクセストークンを更新
 * @param refreshToken リフレッシュトークン
 * @returns 新しいトークンレスポンス
 */
export async function refreshSquareToken(refreshToken: string): Promise<SquareTokenResponse> {
  const [clientId, clientSecret] = await Promise.all([getClientId(), getClientSecret()]);
  const res = await fetch(SQUARE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Square OAuth トークンリフレッシュエラー: ${res.status} ${errorBody}`);
  }

  return res.json() as Promise<SquareTokenResponse>;
}

/**
 * アクセストークンを失効させる
 * @param accessToken 失効させるトークン
 */
export async function revokeSquareToken(accessToken: string): Promise<void> {
  const [clientId, clientSecret] = await Promise.all([getClientId(), getClientSecret()]);
  const res = await fetch(SQUARE_REVOKE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Client ${clientSecret}`,
    },
    body: JSON.stringify({
      client_id: clientId,
      access_token: accessToken,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Square OAuth トークン失効エラー: ${res.status} ${errorBody}`);
  }
}

// --- Square API ---

/**
 * マーチャント情報を取得
 * @param accessToken OAuthアクセストークン
 * @returns マーチャントID・ビジネス名
 */
export async function fetchSquareMerchant(accessToken: string): Promise<{ merchantId: string; businessName: string }> {
  const res = await fetch(`${SQUARE_API_BASE}/v2/merchants/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": "2024-04-17",
    },
  });

  if (!res.ok) {
    throw new Error(`Square Merchant API エラー: ${res.status}`);
  }

  const json = await res.json();
  const merchant = json?.merchant;
  return {
    merchantId: merchant?.id || "",
    businessName: merchant?.business_name || "",
  };
}

/**
 * ロケーション一覧を取得
 * @param accessToken OAuthアクセストークン
 * @returns アクティブなロケーションのリスト
 */
export async function fetchSquareLocations(accessToken: string): Promise<SquareLocation[]> {
  const res = await fetch(`${SQUARE_API_BASE}/v2/locations`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": "2024-04-17",
    },
  });

  if (!res.ok) {
    throw new Error(`Square Locations API エラー: ${res.status}`);
  }

  const json = await res.json();
  const locations = (json?.locations || []) as SquareLocation[];
  return locations.filter((l) => l.status === "ACTIVE");
}

/**
 * Application ID（プラットフォーム共通）を返す
 */
export async function getSquareApplicationId(): Promise<string> {
  return getClientId();
}
