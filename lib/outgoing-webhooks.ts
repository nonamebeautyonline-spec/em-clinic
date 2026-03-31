// lib/outgoing-webhooks.ts — アウトゴーイングWebhook
//
// システムイベント発生時に登録済みの外部URLにPOST送信する。
// HMAC-SHA256署名付き。イベントバスのサブスクライバーとして動作。
//
// 使い方:
//   管理画面で「友だち追加時にhttps://example.com/hookにPOST」と設定
//   → follow イベント発生 → 自動でPOST送信

import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant, tenantPayload } from "@/lib/tenant";
import type { EventType, EventPayload } from "@/lib/event-bus";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export interface OutgoingWebhook {
  id: string;
  name: string;
  url: string;
  event_types: string[]; // ["follow", "tag_added"] or ["*"]
  secret: string | null;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getOutgoingWebhooks(tenantId: string): Promise<OutgoingWebhook[]> {
  const { data } = await strictWithTenant(
    supabaseAdmin.from("outgoing_webhooks").select("*").order("created_at", { ascending: false }),
    tenantId,
  );
  return (data ?? []).map((d) => ({
    ...(d as Record<string, unknown>),
    event_types: typeof (d as Record<string, unknown>).event_types === "string"
      ? JSON.parse((d as Record<string, unknown>).event_types as string)
      : (d as Record<string, unknown>).event_types,
  })) as unknown as OutgoingWebhook[];
}

export async function createOutgoingWebhook(
  input: { name: string; url: string; eventTypes: string[]; secret?: string },
  tenantId: string,
): Promise<OutgoingWebhook> {
  const { data, error } = await supabaseAdmin
    .from("outgoing_webhooks")
    .insert({
      ...tenantPayload(tenantId),
      name: input.name,
      url: input.url,
      event_types: input.eventTypes,
      secret: input.secret ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Webhook作成失敗: ${error.message}`);
  return data as unknown as OutgoingWebhook;
}

export async function updateOutgoingWebhook(
  id: string,
  updates: Partial<{ name: string; url: string; eventTypes: string[]; secret: string; isActive: boolean }>,
  tenantId: string,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.url !== undefined) payload.url = updates.url;
  if (updates.eventTypes !== undefined) payload.event_types = updates.eventTypes;
  if (updates.secret !== undefined) payload.secret = updates.secret;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;

  await strictWithTenant(
    supabaseAdmin.from("outgoing_webhooks").update(payload).eq("id", id),
    tenantId,
  );
}

export async function deleteOutgoingWebhook(id: string, tenantId: string): Promise<void> {
  await strictWithTenant(
    supabaseAdmin.from("outgoing_webhooks").delete().eq("id", id),
    tenantId,
  );
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 署名
// ---------------------------------------------------------------------------

async function signPayload(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Webhook送信
// ---------------------------------------------------------------------------

async function sendWebhook(
  webhook: OutgoingWebhook,
  eventType: string,
  payload: EventPayload,
): Promise<void> {
  const body = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data: {
      tenantId: payload.tenantId,
      patientId: payload.patientId,
      lineUid: payload.lineUid,
      eventData: payload.eventData,
    },
  });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (webhook.secret) {
    headers["X-Webhook-Signature"] = await signPayload(webhook.secret, body);
  }

  const res = await fetch(webhook.url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(10_000), // 10秒タイムアウト
  });

  if (!res.ok) {
    console.error(`[outgoing-webhook] ${webhook.name} → ${res.status}`);
  }
}

// ---------------------------------------------------------------------------
// イベントバスサブスクライバー
// ---------------------------------------------------------------------------

/**
 * イベント発生時に登録済みWebhookにPOST送信する。
 * registerSubscriber(fireOutgoingWebhooks) で登録して使う。
 */
export async function fireOutgoingWebhooks(
  type: EventType,
  payload: EventPayload,
): Promise<void> {
  if (!payload.tenantId) return;

  // アクティブなWebhookを取得
  const { data } = await strictWithTenant(
    supabaseAdmin.from("outgoing_webhooks").select("*").eq("is_active", true),
    payload.tenantId,
  );
  if (!data || data.length === 0) return;

  const webhooks = (data as unknown as OutgoingWebhook[]).filter((w) => {
    const types = Array.isArray(w.event_types) ? w.event_types : JSON.parse(w.event_types as unknown as string);
    return types.includes(type) || types.includes("*");
  });

  // 並列送信（各Webhookの失敗は他に影響しない）
  await Promise.allSettled(
    webhooks.map((w) => sendWebhook(w, type, payload).catch((err) => {
      console.error(`[outgoing-webhook] ${w.name} 送信失敗:`, err);
    })),
  );
}
