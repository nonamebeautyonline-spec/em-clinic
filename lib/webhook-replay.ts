// lib/webhook-replay.ts — Webhook失敗イベントのリプレイディスパッチャー
import { supabaseAdmin } from "@/lib/supabase";
import { processSquareEvent } from "@/lib/webhook-handlers/square";
import { processGmoEvent } from "@/lib/webhook-handlers/gmo";
import { processStripeEvent } from "@/lib/webhook-handlers/stripe";
import { getActiveSquareAccount } from "@/lib/square-account-server";
import type Stripe from "stripe";

interface WebhookEvent {
  id: number;
  tenant_id: string | null;
  event_source: string;
  event_id: string;
  status: string;
  payload: unknown;
  original_payload: unknown;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  completed_at: string | null;
  last_retried_at: string | null;
}

/**
 * 失敗したWebhookイベントをリプレイする
 * original_payload を使って業務ロジックを再実行
 */
export async function replayWebhookEvent(eventId: number, tenantId: string | null): Promise<{ success: boolean; error?: string }> {
  // 1. webhook_events からレコード取得
  const { data: event, error: fetchErr } = await supabaseAdmin
    .from("webhook_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (fetchErr || !event) {
    return { success: false, error: "イベントが見つかりません" };
  }

  const we = event as WebhookEvent;

  // リプレイ可能なステータスか確認
  if (we.status !== "failed") {
    return { success: false, error: `ステータスが failed ではありません（現在: ${we.status}）` };
  }

  // original_payload がない場合はリプレイ不可
  const replayPayload = we.original_payload ?? we.payload;
  if (!replayPayload) {
    return { success: false, error: "リプレイ用ペイロードがありません" };
  }

  // 2. status を processing にリセット + retry_count インクリメント
  await supabaseAdmin
    .from("webhook_events")
    .update({
      status: "processing",
      retry_count: (we.retry_count || 0) + 1,
      last_retried_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", eventId);

  try {
    // 3. event_source に応じてハンドラをディスパッチ
    switch (we.event_source) {
      case "square": {
        const tid = we.tenant_id ?? undefined;
        const sqConfig = await getActiveSquareAccount(tid);
        const squareToken = sqConfig?.accessToken || "";
        const squareEnv = sqConfig?.env || "production";
        await processSquareEvent({
          event: replayPayload as Parameters<typeof processSquareEvent>[0]["event"],
          tenantId: we.tenant_id,
          squareToken,
          squareEnv,
        });
        break;
      }

      case "gmo": {
        const p = replayPayload as Record<string, string>;
        await processGmoEvent({
          status: p.status || "",
          orderId: p.orderId || "",
          amount: p.amount || "",
          accessId: p.accessId || "",
          patientId: p.patientId || "",
          productCode: p.productCode || "",
          productName: p.productName || "",
          reorderId: p.reorderId || "",
          tenantId: we.tenant_id,
        });
        break;
      }

      case "stripe": {
        await processStripeEvent(replayPayload as Stripe.Event);
        break;
      }

      default:
        return { success: false, error: `未対応のevent_source: ${we.event_source}` };
    }

    // 4. 成功 → completed
    await supabaseAdmin
      .from("webhook_events")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    return { success: true };
  } catch (err) {
    // 5. 失敗 → failed + error_message
    const errorMsg = err instanceof Error ? err.message : "unknown error";
    await supabaseAdmin
      .from("webhook_events")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: errorMsg,
      })
      .eq("id", eventId);

    return { success: false, error: errorMsg };
  }
}
