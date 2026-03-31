// lib/ad-conversion.ts — 広告プラットフォームCAPI（Conversions API）
//
// 決済完了等のCVイベント発生時に、Meta/Google/TikTok/X の広告プラットフォームに
// コンバージョンデータを送信する。イベントバスのサブスクライバーとして動作。
//
// フロー:
//   1. 友だち追加時に tracking_visits から gclid/fbclid/ttclid を取得
//   2. CV発生時に sendAdConversions() が呼ばれる
//   3. 各プラットフォームのCAPIにPOST送信
//   4. 結果を ad_conversion_logs に記録

import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant, tenantPayload } from "@/lib/tenant";
import type { EventType, EventPayload } from "@/lib/event-bus";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

interface AdPlatformConfig {
  // Meta
  pixel_id?: string;
  access_token?: string;
  test_event_code?: string;
  // Google
  customer_id?: string;
  conversion_action_id?: string;
  oauth_token?: string;
  developer_token?: string;
  // TikTok
  pixel_code?: string;
  // X
  api_key?: string;
  api_secret?: string;
}

interface ClickIdData {
  gclid: string | null;
  fbclid: string | null;
  twclid: string | null;
  ttclid: string | null;
  user_agent: string | null;
  ip_address: string | null;
}

// ---------------------------------------------------------------------------
// クリックID取得
// ---------------------------------------------------------------------------

/** tracking_visits からクリックIDを取得（最新の有効なレコード） */
async function getClickIds(patientId: string, tenantId: string): Promise<ClickIdData | null> {
  const { data } = await strictWithTenant(
    supabaseAdmin
      .from("tracking_visits")
      .select("gclid, fbclid, twclid, ttclid, user_agent, ip_address")
      .eq("patient_id", patientId)
      .not("gclid", "is", null)
      .order("visited_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    tenantId,
  );

  if (data) return data as ClickIdData;

  // fbclid/twclid/ttclid でも検索
  const { data: data2 } = await strictWithTenant(
    supabaseAdmin
      .from("tracking_visits")
      .select("gclid, fbclid, twclid, ttclid, user_agent, ip_address")
      .eq("patient_id", patientId)
      .or("fbclid.not.is.null,twclid.not.is.null,ttclid.not.is.null")
      .order("visited_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    tenantId,
  );

  return (data2 as ClickIdData) ?? null;
}

// ---------------------------------------------------------------------------
// 各プラットフォームへのCV送信
// ---------------------------------------------------------------------------

async function sendMetaConversion(
  config: AdPlatformConfig,
  clickIds: ClickIdData,
  eventName: string,
  eventValue?: number,
): Promise<void> {
  if (!config.pixel_id || !config.access_token || !clickIds.fbclid) return;

  const url = `https://graph.facebook.com/v21.0/${config.pixel_id}/events`;
  const eventData: Record<string, unknown> = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    user_data: {
      fbc: `fb.1.${Date.now()}.${clickIds.fbclid}`,
      client_ip_address: clickIds.ip_address || undefined,
      client_user_agent: clickIds.user_agent || undefined,
    },
  };
  if (eventValue) {
    eventData.custom_data = { currency: "JPY", value: eventValue };
  }

  const body: Record<string, unknown> = { data: [eventData], access_token: config.access_token };
  if (config.test_event_code) body.test_event_code = config.test_event_code;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Meta CAPI: ${res.status} ${await res.text()}`);
}

async function sendGoogleConversion(
  config: AdPlatformConfig,
  clickIds: ClickIdData,
  eventName: string,
  eventValue?: number,
): Promise<void> {
  if (!config.customer_id || !config.conversion_action_id || !clickIds.gclid) return;

  const url = `https://googleads.googleapis.com/v17/customers/${config.customer_id}:uploadClickConversions`;
  const body = {
    conversions: [{
      gclid: clickIds.gclid,
      conversion_action: `customers/${config.customer_id}/conversionActions/${config.conversion_action_id}`,
      conversion_date_time: new Date().toISOString().replace("Z", "+09:00"),
      ...(eventValue && { conversion_value: eventValue, currency_code: "JPY" }),
    }],
    partial_failure: true,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.oauth_token}`,
      "developer-token": config.developer_token || "",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google Ads: ${res.status} ${await res.text()}`);
}

async function sendTikTokConversion(
  config: AdPlatformConfig,
  clickIds: ClickIdData,
  eventName: string,
  eventValue?: number,
): Promise<void> {
  if (!config.pixel_code || !config.access_token || !clickIds.ttclid) return;

  const url = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
  const body = {
    pixel_code: config.pixel_code,
    event: eventName,
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    context: {
      user_agent: clickIds.user_agent || "",
      ip: clickIds.ip_address || "",
    },
    properties: {
      ...(clickIds.ttclid && { ttclid: clickIds.ttclid }),
      ...(eventValue && { currency: "JPY", value: eventValue }),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": config.access_token || "",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`TikTok CAPI: ${res.status} ${await res.text()}`);
}

async function sendXConversion(
  config: AdPlatformConfig,
  clickIds: ClickIdData,
  eventName: string,
  eventValue?: number,
): Promise<void> {
  if (!clickIds.twclid) return;

  const url = "https://ads-api.x.com/12/measurement/conversions";
  const body = {
    conversions: [{
      conversion_time: new Date().toISOString(),
      event_id: crypto.randomUUID(),
      identifiers: [{ twclid: clickIds.twclid }],
      conversion_id: config.pixel_id,
      event_name: eventName,
      ...(eventValue && { value: { currency: "JPY", amount: String(eventValue) } }),
    }],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`X CAPI: ${res.status} ${await res.text()}`);
}

// ---------------------------------------------------------------------------
// ログ記録
// ---------------------------------------------------------------------------

async function logAdConversion(
  tenantId: string,
  opts: {
    platformId: string;
    patientId: string;
    eventName: string;
    clickId: string;
    clickIdType: string;
    status: "sent" | "failed";
    errorMessage?: string;
  },
): Promise<void> {
  await supabaseAdmin.from("ad_conversion_logs").insert({
    ...tenantPayload(tenantId),
    ad_platform_id: opts.platformId,
    patient_id: opts.patientId,
    event_name: opts.eventName,
    click_id: opts.clickId,
    click_id_type: opts.clickIdType,
    status: opts.status,
    error_message: opts.errorMessage ?? null,
  });
}

// ---------------------------------------------------------------------------
// イベントバスサブスクライバー
// ---------------------------------------------------------------------------

/**
 * CVイベント発生時に全アクティブ広告プラットフォームにCV送信する。
 * registerSubscriber(sendAdConversions) で登録して使う。
 *
 * payload.conversionEventName が設定されている場合のみ実行。
 */
export async function sendAdConversions(
  type: EventType,
  payload: EventPayload,
): Promise<void> {
  if (!payload.patientId || !payload.tenantId || !payload.conversionEventName) return;

  const clickIds = await getClickIds(payload.patientId, payload.tenantId);
  if (!clickIds) return;

  // アクティブなプラットフォームを取得
  const { data: platforms } = await strictWithTenant(
    supabaseAdmin.from("ad_platforms").select("*").eq("is_active", true),
    payload.tenantId,
  );
  if (!platforms || platforms.length === 0) return;

  for (const platform of platforms) {
    const p = platform as { id: string; name: string; config: string };
    const config: AdPlatformConfig = typeof p.config === "string" ? JSON.parse(p.config) : p.config;

    try {
      switch (p.name) {
        case "meta":
          await sendMetaConversion(config, clickIds, payload.conversionEventName, payload.conversionValue);
          if (clickIds.fbclid) {
            await logAdConversion(payload.tenantId, {
              platformId: p.id, patientId: payload.patientId,
              eventName: payload.conversionEventName,
              clickId: clickIds.fbclid, clickIdType: "fbclid", status: "sent",
            });
          }
          break;
        case "google":
          await sendGoogleConversion(config, clickIds, payload.conversionEventName, payload.conversionValue);
          if (clickIds.gclid) {
            await logAdConversion(payload.tenantId, {
              platformId: p.id, patientId: payload.patientId,
              eventName: payload.conversionEventName,
              clickId: clickIds.gclid, clickIdType: "gclid", status: "sent",
            });
          }
          break;
        case "tiktok":
          await sendTikTokConversion(config, clickIds, payload.conversionEventName, payload.conversionValue);
          if (clickIds.ttclid) {
            await logAdConversion(payload.tenantId, {
              platformId: p.id, patientId: payload.patientId,
              eventName: payload.conversionEventName,
              clickId: clickIds.ttclid, clickIdType: "ttclid", status: "sent",
            });
          }
          break;
        case "x":
          await sendXConversion(config, clickIds, payload.conversionEventName, payload.conversionValue);
          if (clickIds.twclid) {
            await logAdConversion(payload.tenantId, {
              platformId: p.id, patientId: payload.patientId,
              eventName: payload.conversionEventName,
              clickId: clickIds.twclid, clickIdType: "twclid", status: "sent",
            });
          }
          break;
      }
    } catch (error) {
      await logAdConversion(payload.tenantId, {
        platformId: p.id,
        patientId: payload.patientId,
        eventName: payload.conversionEventName,
        clickId: clickIds.fbclid || clickIds.gclid || clickIds.ttclid || clickIds.twclid || "",
        clickIdType: p.name,
        status: "failed",
        errorMessage: String(error),
      });
    }
  }
}
