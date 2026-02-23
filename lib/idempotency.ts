// lib/idempotency.ts — Webhook/API冪等キーチェック
// webhook_events テーブルの UNIQUE(event_source, event_id) でアトミックに重複検出
// 設計方針: DB障害時は処理続行（冪等チェックなし）

import { supabaseAdmin } from "@/lib/supabase";

interface IdempotencyResult {
  /** true = 既に処理済みまたは処理中（スキップすべき） */
  duplicate: boolean;
  /** 処理完了時に呼ぶ */
  markCompleted: () => Promise<void>;
  /** 処理失敗時に呼ぶ */
  markFailed: (error?: string) => Promise<void>;
}

/**
 * 冪等キーでイベントの重複をチェック
 * @param source イベントソース（'square', 'gmo', 'send_reminder' 等）
 * @param eventId 外部イベントID or 自前生成キー
 * @param tenantId テナントID（nullable）
 * @param payload デバッグ用ペイロード（任意）
 */
export async function checkIdempotency(
  source: string,
  eventId: string,
  tenantId: string | null,
  payload?: unknown,
): Promise<IdempotencyResult> {
  // eventId が空なら冪等チェックをスキップ
  if (!eventId) {
    return { duplicate: false, markCompleted: async () => {}, markFailed: async () => {} };
  }

  try {
    const { error } = await supabaseAdmin.from("webhook_events").insert({
      tenant_id: tenantId,
      event_source: source,
      event_id: eventId,
      status: "processing",
      payload: payload != null ? payload : null,
    });

    if (error?.code === "23505") {
      // UNIQUE違反 = 既に処理済み or 処理中
      console.log(`[idempotency] 重複検出: source=${source}, event_id=${eventId}`);
      return { duplicate: true, markCompleted: async () => {}, markFailed: async () => {} };
    }

    if (error) {
      console.error("[idempotency] insert error:", error);
      // DB障害時は処理続行
      return { duplicate: false, markCompleted: async () => {}, markFailed: async () => {} };
    }

    return {
      duplicate: false,
      markCompleted: async () => {
        await supabaseAdmin
          .from("webhook_events")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("event_source", source)
          .eq("event_id", eventId);
      },
      markFailed: async (errorMsg?: string) => {
        await supabaseAdmin
          .from("webhook_events")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            ...(errorMsg ? { payload: { error: errorMsg } } : {}),
          })
          .eq("event_source", source)
          .eq("event_id", eventId);
      },
    };
  } catch (err) {
    console.error("[idempotency] error:", err);
    return { duplicate: false, markCompleted: async () => {}, markFailed: async () => {} };
  }
}
