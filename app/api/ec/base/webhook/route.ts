// app/api/ec/base/webhook/route.ts — BASE Webhook受信エンドポイント
// 対応イベント: order.created, order.shipped

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";
import { pushMessage } from "@/lib/line-push";
import { baseAdapter } from "@/lib/ec-integrations/base";
import { buildShippingNotifyMessage } from "@/lib/shipping-notify-flex";

/**
 * BASEからテナントを特定する
 * BASEはShopifyのようにshop_domainヘッダーを送らないため、
 * ec_integrationsテーブルからBASE連携が有効なテナントを取得し、
 * payloadの内容でマッチングする。
 */
async function resolveTenant(
  payload: Record<string, unknown>,
): Promise<{ tenantId: string } | null> {
  // BASEのshop_idがペイロードに含まれる場合はそれで特定
  const shopId = payload.shop_id as string | undefined;

  const { data: integrations } = await supabaseAdmin
    .from("ec_integrations")
    .select("tenant_id, shop_domain, settings")
    .eq("platform", "base")
    .eq("is_active", true);

  if (!integrations || integrations.length === 0) return null;

  // shop_idでマッチング
  if (shopId) {
    const match = integrations.find((i) => {
      const settings = (i.settings || {}) as Record<string, unknown>;
      return i.shop_domain === shopId || settings.shop_id === shopId;
    });
    if (match) return { tenantId: match.tenant_id };
  }

  // テナントが1つだけの場合はそれを使用（小規模運用向け）
  if (integrations.length === 1) {
    return { tenantId: integrations[0].tenant_id };
  }

  return null;
}

/**
 * メール or 電話番号から患者を逆引き
 */
async function findPatient(
  tenantId: string,
  email?: string,
  phone?: string,
): Promise<{ id: number; line_id: string | null } | null> {
  if (email) {
    const { data } = await supabaseAdmin
      .from("patients")
      .select("id, line_id")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .maybeSingle();
    if (data) return data;
  }
  if (phone) {
    const { data } = await supabaseAdmin
      .from("patients")
      .select("id, line_id")
      .eq("tenant_id", tenantId)
      .eq("tel", phone)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "JSONパースに失敗しました" },
      { status: 400 },
    );
  }

  // テナント特定
  const tenant = await resolveTenant(payload);
  if (!tenant) {
    console.warn("[base-webhook] テナントを特定できませんでした");
    return NextResponse.json(
      { error: "テナントを特定できませんでした" },
      { status: 404 },
    );
  }

  const { tenantId } = tenant;
  const eventType = (payload.event_type as string) || "";

  try {
    switch (eventType) {
      case "order.created":
        await handleOrderCreated(tenantId, payload);
        break;
      case "order.shipped":
        await handleOrderShipped(tenantId, payload);
        break;
      default:
        console.log(`[base-webhook] 未対応のイベント: ${eventType}`);
    }

    // last_synced_at更新
    await supabaseAdmin
      .from("ec_integrations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("platform", "base");

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[base-webhook] Error:", e);
    return NextResponse.json(
      { error: "Webhook処理中にエラーが発生しました" },
      { status: 500 },
    );
  }
}

// --- 注文作成 → カゴ落ち回収済みマーク ---
async function handleOrderCreated(
  tenantId: string,
  payload: Record<string, unknown>,
) {
  const order = baseAdapter.parseOrder(payload);
  const patient = await findPatient(tenantId, order.email, order.phone);

  if (!patient) return;

  // 未回収のカゴ落ちレコードを回収済みに更新
  await supabaseAdmin
    .from("abandoned_carts")
    .update({ recovered_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("patient_id", patient.id)
    .is("recovered_at", null);
}

// --- 発送完了 → LINE通知 ---
async function handleOrderShipped(
  tenantId: string,
  payload: Record<string, unknown>,
) {
  const order = baseAdapter.parseOrder(payload);
  const patient = await findPatient(tenantId, order.email, order.phone);

  if (!patient?.line_id) return;

  // 商品リストを抽出
  const items = order.lineItems.map((item) => ({
    name: item.name,
    quantity: item.quantity,
  }));

  // 追跡番号はpayloadから直接取得（parseOrderではtrackingUrlに変換済み）
  const trackingNumber = (payload.tracking_number as string) || undefined;
  const carrier = (payload.delivery_company as string) || undefined;

  // Flex Messageで発送通知送信
  const flexMessage = buildShippingNotifyMessage({
    orderNumber: order.externalId || undefined,
    items: items.length > 0 ? items : [{ name: "ご注文の商品", quantity: 1 }],
    trackingNumber,
    trackingUrl: order.trackingUrl,
    carrier,
  });

  await pushMessage(patient.line_id, [flexMessage], tenantId);

  // メッセージログINSERT（必須）
  await supabaseAdmin.from("message_log").insert({
    ...tenantPayload(tenantId),
    patient_id: patient.id,
    line_uid: patient.line_id,
    message_type: "shipping_notify",
    content: "発送通知（BASE）",
    status: "sent",
    direction: "outgoing",
  });
}
