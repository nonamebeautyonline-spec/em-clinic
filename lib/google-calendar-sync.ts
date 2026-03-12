// lib/google-calendar-sync.ts — Google Calendar 双方向同期ライブラリ
// 予約⇔GCalイベントのincremental sync、push通知チャンネル管理

import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import {
  refreshAccessToken,
  calculateTokenExpiry,
  insertEvent,
  deleteEvent,
  type GoogleCalendarEventInput,
  type GoogleCalendarEvent,
} from "@/lib/google-calendar";

const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";

// =============================================
// 型定義
// =============================================

/** 予約データ（同期に必要な最小フィールド） */
export interface ReservationForSync {
  reserve_id: string;
  patient_name?: string | null;
  reserved_date: string;
  reserved_time: string;
  status?: string;
  prescription_menu?: string | null;
  gcal_event_id?: string | null;
}

/** GCal incremental syncレスポンス */
interface GcalEventsListResponse {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

// =============================================
// トークン取得ヘルパー
// =============================================

/**
 * テナントのGoogle連携済み医師からアクセストークンを取得
 * 期限切れの場合はリフレッシュしてDBを更新
 */
async function getAccessToken(
  tenantId: string
): Promise<{ accessToken: string; calendarId: string; doctorId: string } | null> {
  // Google連携済みの最初の医師を取得
  const { data: doctor } = await withTenant(
    supabaseAdmin
      .from("doctors")
      .select(
        "doctor_id, google_calendar_id, google_access_token, google_refresh_token, google_token_expires_at"
      )
      .not("google_refresh_token", "is", null)
      .limit(1),
    tenantId
  );

  if (!doctor || doctor.length === 0) return null;

  const doc = doctor[0];
  let accessToken = doc.google_access_token;
  const expiresAt = doc.google_token_expires_at
    ? new Date(doc.google_token_expires_at)
    : new Date(0);

  // トークン期限切れならリフレッシュ
  if (expiresAt <= new Date()) {
    try {
      const newTokens = await refreshAccessToken(doc.google_refresh_token);
      accessToken = newTokens.access_token;
      const newExpiresAt = calculateTokenExpiry(newTokens.expires_in);

      await supabaseAdmin
        .from("doctors")
        .update({
          google_access_token: accessToken,
          google_token_expires_at: newExpiresAt,
          ...(newTokens.refresh_token
            ? { google_refresh_token: newTokens.refresh_token }
            : {}),
        })
        .eq("doctor_id", doc.doctor_id)
        .eq("tenant_id", tenantId);
    } catch (err) {
      console.error("[gcal-sync] トークンリフレッシュ失敗:", err);
      return null;
    }
  }

  return {
    accessToken: accessToken!,
    calendarId: doc.google_calendar_id || "primary",
    doctorId: doc.doctor_id,
  };
}

// =============================================
// 予約 → GCal 同期
// =============================================

/**
 * 予約をGoogleカレンダーにイベントとして作成/更新
 */
export async function syncReservationToGcal(
  tenantId: string,
  reservation: ReservationForSync
): Promise<string | null> {
  const auth = await getAccessToken(tenantId);
  if (!auth) {
    console.warn("[gcal-sync] Google連携未設定のためスキップ: tenant=", tenantId);
    return null;
  }

  const { accessToken, calendarId } = auth;

  // 予約時間をISO8601に変換（Asia/Tokyo）
  const startDateTime = `${reservation.reserved_date}T${reservation.reserved_time}+09:00`;
  const startDate = new Date(startDateTime);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30分枠
  const endHours = String(endDate.getUTCHours() + 9).padStart(2, "0"); // JST変換
  const endMinutes = String(endDate.getUTCMinutes()).padStart(2, "0");
  const endSeconds = String(endDate.getUTCSeconds()).padStart(2, "0");
  const endDateTime = `${reservation.reserved_date}T${endHours}:${endMinutes}:${endSeconds}+09:00`;

  const eventInput: GoogleCalendarEventInput = {
    summary: `[予約] ${reservation.patient_name || "名前なし"}`,
    description: `reserve_id:${reservation.reserve_id}\n処方: ${reservation.prescription_menu || "未定"}\nステータス: ${reservation.status || "未確定"}`,
    start: { dateTime: startDateTime, timeZone: "Asia/Tokyo" },
    end: { dateTime: endDateTime, timeZone: "Asia/Tokyo" },
  };

  // 既存イベントがある場合は更新（PATCH）、なければ新規作成
  if (reservation.gcal_event_id) {
    try {
      await updateGcalEvent(accessToken, calendarId, reservation.gcal_event_id, eventInput);
      return reservation.gcal_event_id;
    } catch (err) {
      console.error("[gcal-sync] イベント更新失敗、新規作成にフォールバック:", err);
    }
  }

  try {
    const created = await insertEvent(accessToken, calendarId, eventInput);
    // gcal_event_id をreservationsテーブルに保存
    await supabaseAdmin
      .from("reservations")
      .update({ gcal_event_id: created.id })
      .eq("reserve_id", reservation.reserve_id);

    return created.id;
  } catch (err) {
    console.error("[gcal-sync] イベント作成失敗:", err);
    return null;
  }
}

/**
 * GCalイベントを更新（PATCH）
 */
async function updateGcalEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: GoogleCalendarEventInput
): Promise<GoogleCalendarEvent> {
  const encodedCalendarId = encodeURIComponent(calendarId);
  const url = `${GOOGLE_API_BASE}/calendars/${encodedCalendarId}/events/${encodeURIComponent(eventId)}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google Calendar イベント更新エラー: ${res.status} ${errorBody}`);
  }

  return res.json() as Promise<GoogleCalendarEvent>;
}

// =============================================
// GCal イベント削除
// =============================================

/**
 * GCalイベントを削除
 */
export async function deleteGcalEvent(
  tenantId: string,
  eventId: string
): Promise<void> {
  const auth = await getAccessToken(tenantId);
  if (!auth) return;

  try {
    await deleteEvent(auth.accessToken, auth.calendarId, eventId);
  } catch (err) {
    console.error("[gcal-sync] イベント削除失敗:", err);
  }
}

// =============================================
// GCal → 予約 同期（incremental sync）
// =============================================

/**
 * GCalからの変更を取得してreservationsに反映
 * incremental sync token を使って差分のみ取得
 */
export async function processGcalChanges(tenantId: string): Promise<{
  processed: number;
  errors: number;
}> {
  const auth = await getAccessToken(tenantId);
  if (!auth) return { processed: 0, errors: 0 };

  const { accessToken, calendarId } = auth;
  let processed = 0;
  let errors = 0;

  // sync tokenを取得
  const { data: syncRecord } = await withTenant(
    supabaseAdmin
      .from("google_calendar_sync_tokens")
      .select("id, sync_token")
      .eq("calendar_id", calendarId)
      .maybeSingle(),
    tenantId
  );

  try {
    // incremental sync リクエスト
    const params = new URLSearchParams();
    if (syncRecord?.sync_token) {
      params.set("syncToken", syncRecord.sync_token);
    } else {
      // 初回: 過去30日〜未来30日のイベントをフルスキャン
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      params.set("timeMin", thirtyDaysAgo.toISOString());
      params.set("timeMax", thirtyDaysLater.toISOString());
    }

    let nextPageToken: string | undefined;
    let nextSyncToken: string | undefined;
    const allEvents: GoogleCalendarEvent[] = [];

    // ページネーション対応でイベント取得
    do {
      if (nextPageToken) {
        params.set("pageToken", nextPageToken);
      }

      const encodedCalendarId = encodeURIComponent(calendarId);
      const url = `${GOOGLE_API_BASE}/calendars/${encodedCalendarId}/events?${params.toString()}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        // 410 Gone = sync tokenが無効 → フルスキャンにフォールバック
        if (res.status === 410) {
          console.warn("[gcal-sync] sync token無効、リセットします");
          // sync tokenをクリアして再実行
          if (syncRecord) {
            await supabaseAdmin
              .from("google_calendar_sync_tokens")
              .update({ sync_token: null, updated_at: new Date().toISOString() })
              .eq("id", syncRecord.id);
          }
          return processGcalChanges(tenantId);
        }
        throw new Error(`GCal events取得エラー: ${res.status}`);
      }

      const data = (await res.json()) as GcalEventsListResponse;
      if (data.items) {
        allEvents.push(...data.items);
      }
      nextPageToken = data.nextPageToken;
      nextSyncToken = data.nextSyncToken;
    } while (nextPageToken);

    // 各イベントの変更を処理
    for (const event of allEvents) {
      try {
        await processGcalEvent(tenantId, event);
        processed++;
      } catch (err) {
        console.error(`[gcal-sync] イベント処理失敗 eventId=${event.id}:`, err);
        errors++;
      }
    }

    // sync tokenを保存
    if (nextSyncToken) {
      if (syncRecord) {
        await supabaseAdmin
          .from("google_calendar_sync_tokens")
          .update({
            sync_token: nextSyncToken,
            updated_at: new Date().toISOString(),
          })
          .eq("id", syncRecord.id);
      } else {
        await supabaseAdmin.from("google_calendar_sync_tokens").insert({
          ...tenantPayload(tenantId),
          calendar_id: calendarId,
          sync_token: nextSyncToken,
        });
      }
    }
  } catch (err) {
    console.error("[gcal-sync] processGcalChanges エラー:", err);
    errors++;
  }

  return { processed, errors };
}

/**
 * 個別のGCalイベント変更をreservationsに反映
 */
async function processGcalEvent(
  tenantId: string,
  event: GoogleCalendarEvent
): Promise<void> {
  // descriptionからreserve_idを抽出
  const reserveIdMatch = event.description?.match(/reserve_id:([A-Za-z0-9_-]+)/);
  if (!reserveIdMatch) {
    // em-clinic由来でないイベントはスキップ
    return;
  }

  const reserveId = reserveIdMatch[1];

  // 対応する予約を取得
  const { data: reservation } = await withTenant(
    supabaseAdmin
      .from("reservations")
      .select("reserve_id, reserved_date, reserved_time, status")
      .eq("reserve_id", reserveId)
      .maybeSingle(),
    tenantId
  );

  if (!reservation) return;

  // キャンセルされたイベント → 予約をキャンセル
  if (event.status === "cancelled") {
    if (reservation.status !== "canceled") {
      await supabaseAdmin
        .from("reservations")
        .update({ status: "canceled" })
        .eq("reserve_id", reserveId);
      console.log(`[gcal-sync] 予約キャンセル反映: reserve_id=${reserveId}`);
    }
    return;
  }

  // 日時変更の検出と反映
  if (event.start?.dateTime) {
    const gcalStart = new Date(event.start.dateTime);
    // JST変換
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(gcalStart.getTime() + jstOffset);
    const newDate = jstDate.toISOString().slice(0, 10);
    const newTime = jstDate.toISOString().slice(11, 16);

    if (
      newDate !== reservation.reserved_date ||
      newTime !== reservation.reserved_time
    ) {
      await supabaseAdmin
        .from("reservations")
        .update({
          reserved_date: newDate,
          reserved_time: newTime,
        })
        .eq("reserve_id", reserveId);
      console.log(
        `[gcal-sync] 予約日時変更反映: reserve_id=${reserveId} → ${newDate} ${newTime}`
      );
    }
  }
}

// =============================================
// Push通知チャンネル管理
// =============================================

/**
 * GCal push通知チャンネルを設定
 * Vercelのサーバーレス環境ではwebhook受信URLを指定
 */
export async function setupWatchChannel(
  tenantId: string
): Promise<{ channelId: string; expiration: string } | null> {
  const auth = await getAccessToken(tenantId);
  if (!auth) return null;

  const { accessToken, calendarId } = auth;

  const channelId = `gcal-sync-${tenantId}-${Date.now()}`;
  const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://app.l-ope.jp"}/api/admin/google-calendar/webhook`;

  // Google Calendar API: events.watch
  const encodedCalendarId = encodeURIComponent(calendarId);
  const url = `${GOOGLE_API_BASE}/calendars/${encodedCalendarId}/events/watch`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: channelId,
      type: "web_hook",
      address: webhookUrl,
      params: { ttl: "604800" }, // 7日間（最大）
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[gcal-sync] watch channel設定失敗:", errorBody);
    return null;
  }

  const data = (await res.json()) as {
    id: string;
    expiration: string;
  };

  const expiration = new Date(Number(data.expiration)).toISOString();

  // DBに保存
  const { data: existing } = await withTenant(
    supabaseAdmin
      .from("google_calendar_sync_tokens")
      .select("id")
      .eq("calendar_id", calendarId)
      .maybeSingle(),
    tenantId
  );

  if (existing) {
    await supabaseAdmin
      .from("google_calendar_sync_tokens")
      .update({
        channel_id: channelId,
        channel_expiration: expiration,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("google_calendar_sync_tokens").insert({
      ...tenantPayload(tenantId),
      calendar_id: calendarId,
      channel_id: channelId,
      channel_expiration: expiration,
    });
  }

  console.log(
    `[gcal-sync] watch channel設定完了: tenant=${tenantId}, channel=${channelId}, expires=${expiration}`
  );

  return { channelId, expiration };
}
