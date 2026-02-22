// lib/sse.ts — SSE（Server-Sent Events）ユーティリティ
// ダッシュボードのリアルタイム更新用

/**
 * SSEイベントの型定義
 * - reservation_update: 予約の新規・キャンセル
 * - payment_update: 決済完了
 * - new_patient: 新規患者登録
 * - ping: 接続維持用キープアライブ
 */
export type SSEEventType =
  | "reservation_update"
  | "payment_update"
  | "new_patient"
  | "ping";

export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * SSEイベントをテキスト形式にフォーマット
 * SSEプロトコルに準拠: `event:` + `data:` + 空行
 */
export function formatSSEEvent(event: SSEEvent): string {
  const lines = [
    `event: ${event.type}`,
    `data: ${JSON.stringify(event.data)}`,
    "",
    "", // SSE仕様: イベントの終端は空行
  ];
  return lines.join("\n");
}

/**
 * キープアライブ用のpingイベントを生成
 */
export function createPingEvent(): SSEEvent {
  return {
    type: "ping",
    data: { message: "keep-alive" },
    timestamp: new Date().toISOString(),
  };
}

/**
 * ダッシュボードの差分検出用スナップショット
 * 各テーブルの最新カウントを保持し、前回との差分を検出する
 */
export interface DashboardSnapshot {
  reservationCount: number;
  cancelledCount: number;
  paidCount: number;
  newPatientCount: number;
  latestReservationAt: string | null;
  latestPaidAt: string | null;
  latestPatientAt: string | null;
}

/**
 * スナップショットの差分を比較し、変更があったイベントを生成
 */
export function detectChanges(
  prev: DashboardSnapshot,
  current: DashboardSnapshot,
): SSEEvent[] {
  const events: SSEEvent[] = [];
  const now = new Date().toISOString();

  // 予約の変更検出
  if (
    current.reservationCount !== prev.reservationCount ||
    current.cancelledCount !== prev.cancelledCount
  ) {
    events.push({
      type: "reservation_update",
      data: {
        reservationCount: current.reservationCount,
        cancelledCount: current.cancelledCount,
        diff: current.reservationCount - prev.reservationCount,
        cancelDiff: current.cancelledCount - prev.cancelledCount,
      },
      timestamp: now,
    });
  }

  // 決済の変更検出
  if (current.paidCount !== prev.paidCount) {
    events.push({
      type: "payment_update",
      data: {
        paidCount: current.paidCount,
        diff: current.paidCount - prev.paidCount,
      },
      timestamp: now,
    });
  }

  // 新規患者の変更検出
  if (current.newPatientCount !== prev.newPatientCount) {
    events.push({
      type: "new_patient",
      data: {
        newPatientCount: current.newPatientCount,
        diff: current.newPatientCount - prev.newPatientCount,
      },
      timestamp: now,
    });
  }

  return events;
}

/**
 * SSEレスポンスヘッダー
 */
export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no", // nginx等のプロキシでバッファリングを無効化
} as const;

/**
 * SSE設定値
 */
export const SSE_CONFIG = {
  /** ポーリング間隔（ミリ秒）: データベースの変更を30秒ごとにチェック */
  POLL_INTERVAL_MS: 30_000,
  /** キープアライブ間隔（ミリ秒）: 25秒ごとにpingを送信 */
  KEEPALIVE_INTERVAL_MS: 25_000,
  /** ストリーム最大寿命（ミリ秒）: Vercelの60秒タイムアウトを考慮し55秒で終了 */
  MAX_STREAM_DURATION_MS: 55_000,
} as const;
