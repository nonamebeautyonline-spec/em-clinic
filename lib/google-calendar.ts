// lib/google-calendar.ts
// Google Calendar API v3 のREST API直接呼び出しライブラリ
// googleapis パッケージは使わず、fetch で直接実装

const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_OAUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

// 環境変数（サーバーサイドのみ使用）
function getClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID が未設定です");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET が未設定です");
  return secret;
}

function getRedirectUri(): string {
  const uri = process.env.GOOGLE_REDIRECT_URI;
  if (!uri) throw new Error("GOOGLE_REDIRECT_URI が未設定です");
  return uri;
}

// =============================================
// 型定義
// =============================================

/** Googleカレンダーイベント（簡略版） */
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string; // ISO8601（時間指定イベント）
    date?: string; // YYYY-MM-DD（終日イベント）
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string; // "confirmed" | "tentative" | "cancelled"
}

/** イベント作成時のペイロード */
export interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
}

/** トークン交換レスポンス */
export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string; // 初回のみ返される
  expires_in: number; // 秒
  token_type: string;
  scope: string;
}

/** イベント一覧レスポンス */
interface GoogleEventsListResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

// =============================================
// OAuth2 認証フロー
// =============================================

/**
 * OAuth2認証URLを生成
 * @param tenantId テナントID
 * @param doctorId 医師ID
 * @returns 認証URL
 */
export function getAuthUrl(tenantId: string, doctorId: string): string {
  // stateにテナントIDと医師IDをエンコード（CSRF対策とコールバック時の識別用）
  const state = Buffer.from(JSON.stringify({ tenantId, doctorId })).toString("base64url");

  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline", // リフレッシュトークンを取得するために必要
    prompt: "consent", // 毎回同意画面を表示（リフレッシュトークンを確実に取得）
    state,
  });

  return `${GOOGLE_OAUTH_BASE}?${params.toString()}`;
}

/**
 * 認証コードをアクセストークンに交換
 * @param code OAuth2認証コード
 * @returns トークンレスポンス
 */
export async function exchangeCode(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google OAuth2 トークン交換エラー: ${res.status} ${errorBody}`);
  }

  return res.json() as Promise<GoogleTokenResponse>;
}

/**
 * リフレッシュトークンでアクセストークンを更新
 * @param refreshToken リフレッシュトークン
 * @returns 新しいトークンレスポンス
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google OAuth2 トークンリフレッシュエラー: ${res.status} ${errorBody}`);
  }

  return res.json() as Promise<GoogleTokenResponse>;
}

// =============================================
// カレンダーAPI操作
// =============================================

/**
 * カレンダーイベント一覧を取得
 * @param accessToken アクセストークン
 * @param calendarId カレンダーID（デフォルト: "primary"）
 * @param timeMin 取得開始日時（ISO8601）
 * @param timeMax 取得終了日時（ISO8601）
 * @returns イベント一覧
 */
export async function listEvents(
  accessToken: string,
  calendarId: string = "primary",
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const allEvents: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  // ページネーション対応
  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true", // 繰り返しイベントを展開
      orderBy: "startTime",
      maxResults: "250",
    });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const encodedCalendarId = encodeURIComponent(calendarId);
    const url = `${GOOGLE_API_BASE}/calendars/${encodedCalendarId}/events?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Google Calendar イベント取得エラー: ${res.status} ${errorBody}`);
    }

    const data = (await res.json()) as GoogleEventsListResponse;
    allEvents.push(...(data.items || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allEvents;
}

/**
 * カレンダーにイベントを追加
 * @param accessToken アクセストークン
 * @param calendarId カレンダーID（デフォルト: "primary"）
 * @param event イベントデータ
 * @returns 作成されたイベント
 */
export async function insertEvent(
  accessToken: string,
  calendarId: string = "primary",
  event: GoogleCalendarEventInput
): Promise<GoogleCalendarEvent> {
  const encodedCalendarId = encodeURIComponent(calendarId);
  const url = `${GOOGLE_API_BASE}/calendars/${encodedCalendarId}/events`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google Calendar イベント追加エラー: ${res.status} ${errorBody}`);
  }

  return res.json() as Promise<GoogleCalendarEvent>;
}

/**
 * カレンダーからイベントを削除
 * @param accessToken アクセストークン
 * @param calendarId カレンダーID（デフォルト: "primary"）
 * @param eventId イベントID
 */
export async function deleteEvent(
  accessToken: string,
  calendarId: string = "primary",
  eventId: string
): Promise<void> {
  const encodedCalendarId = encodeURIComponent(calendarId);
  const url = `${GOOGLE_API_BASE}/calendars/${encodedCalendarId}/events/${encodeURIComponent(eventId)}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 204 No Content or 410 Gone（既に削除済み）は正常
  if (!res.ok && res.status !== 204 && res.status !== 410) {
    const errorBody = await res.text();
    throw new Error(`Google Calendar イベント削除エラー: ${res.status} ${errorBody}`);
  }
}

// =============================================
// ヘルパー関数
// =============================================

/**
 * stateパラメータをデコード
 * @param state Base64urlエンコードされたstate
 * @returns パースされたオブジェクト
 */
export function decodeState(state: string): { tenantId: string; doctorId: string } {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (!parsed.tenantId || !parsed.doctorId) {
      throw new Error("stateにtenantIdまたはdoctorIdがありません");
    }
    return parsed;
  } catch (error) {
    throw new Error(`stateのデコードに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * トークンの有効期限を計算
 * @param expiresIn 有効期間（秒）
 * @returns 有効期限のISO8601文字列
 */
export function calculateTokenExpiry(expiresIn: number): string {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}
