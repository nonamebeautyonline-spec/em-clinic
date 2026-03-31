// lib/event-bus.ts — 全イベントの中央ディスパッチ
//
// in-process 非同期方式。イベント発生時に登録済みのサブスクライバーを
// Promise.allSettled で並列実行する。各サブスクライバーの失敗は他に影響しない。
//
// 使い方:
//   import { fireEvent } from "@/lib/event-bus";
//   await fireEvent("tag_added", { tenantId, patientId, eventData: { tagId: 123 } });

// ---------------------------------------------------------------------------
// イベント型定義
// ---------------------------------------------------------------------------

/** サポートするイベント種別 */
export type EventType =
  // LINE友だちイベント
  | "follow"
  | "unfollow"
  | "message_received"
  // タグ操作
  | "tag_added"
  | "tag_removed"
  // 業務イベント
  | "reservation_made"
  | "checkout_completed"
  | "reorder_approved"
  // フォーム
  | "form_submitted"
  // CV
  | "cv_tracked"
  // 外部Webhook受信
  | "incoming_webhook";

/** イベントペイロード（全イベント共通） */
export interface EventPayload {
  tenantId: string;
  patientId?: string;
  lineUid?: string;
  /** イベント固有データ（tagId, formSlug, amount 等） */
  eventData?: Record<string, unknown>;
  /** CV追跡用（Phase 2 で使用） */
  conversionEventName?: string;
  conversionValue?: number;
}

// ---------------------------------------------------------------------------
// サブスクライバー管理
// ---------------------------------------------------------------------------

type Subscriber = (type: EventType, payload: EventPayload) => Promise<void>;

/** 登録済みサブスクライバー一覧 */
const subscribers: Subscriber[] = [];

/**
 * サブスクライバーを登録する（アプリ起動時に1回だけ呼ぶ）
 *
 * サブスクライバーは以下の契約を守ること:
 * - 内部でエラーをキャッチし、失敗しても例外を投げない
 * - 重い処理は fire-and-forget で実行する
 */
export function registerSubscriber(fn: Subscriber): void {
  subscribers.push(fn);
}

// ---------------------------------------------------------------------------
// イベント発火
// ---------------------------------------------------------------------------

/**
 * イベントを発火し、全サブスクライバーを並列実行する。
 *
 * - 各サブスクライバーの失敗は console.error でログを残すが、
 *   他のサブスクライバーや呼び出し元には影響しない。
 * - 呼び出し元は `fireEvent(...).catch(() => {})` で
 *   fire-and-forget にしてもよい。
 */
export async function fireEvent(
  type: EventType,
  payload: EventPayload,
): Promise<void> {
  if (subscribers.length === 0) return;

  const results = await Promise.allSettled(
    subscribers.map((fn) => fn(type, payload)),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        `[event-bus] サブスクライバーエラー event=${type}:`,
        result.reason,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// デフォルトサブスクライバーの登録（Phase 2 以降で追加）
// ---------------------------------------------------------------------------

// サブスクライバー登録（遅延インポートでバンドル最適化）
registerSubscriber(async (type, payload) => {
  const { processScoring } = await import("@/lib/scoring");
  await processScoring(type, payload);
});

registerSubscriber(async (type, payload) => {
  const { fireOutgoingWebhooks } = await import("@/lib/outgoing-webhooks");
  await fireOutgoingWebhooks(type, payload);
});

registerSubscriber(async (type, payload) => {
  const { sendAdConversions } = await import("@/lib/ad-conversion");
  await sendAdConversions(type, payload);
});

// ---------------------------------------------------------------------------
// イベントログ（監査用・デバッグ用）
// ---------------------------------------------------------------------------

/**
 * イベントログサブスクライバー
 * event_log テーブルにイベントを記録する（Phase 1 のマイグレーションで作成）
 */
async function logEvent(type: EventType, payload: EventPayload): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const { tenantPayload: tp } = await import("@/lib/tenant");

    await supabaseAdmin.from("event_log").insert({
      ...tp(payload.tenantId),
      event_type: type,
      patient_id: payload.patientId ?? null,
      line_uid: payload.lineUid ?? null,
      event_data: payload.eventData ?? {},
    });
  } catch (e) {
    // ログ失敗は無視（本体処理を妨げない）
    console.error("[event-bus] イベントログ記録失敗:", (e as Error).message);
  }
}

// デフォルトでイベントログを登録
registerSubscriber(logEvent);
