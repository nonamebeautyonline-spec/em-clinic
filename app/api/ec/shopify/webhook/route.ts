import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";
import { pushMessage } from "@/lib/line-push";
import { buildShippingNotifyMessage } from "@/lib/shipping-notify-flex";
import crypto from "crypto";

// Shopify HMAC署名検証（タイミング攻撃対策）
function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  secret: string,
): boolean {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(hmacHeader),
    );
  } catch {
    // バッファ長不一致 → 不正な署名
    return false;
  }
}

// Shopify Webhook受信エンドポイント
// 対応トピック: checkouts/create, checkouts/update, orders/create, orders/fulfilled
export async function POST(req: NextRequest) {
  const body = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic");
  const shopDomain = req.headers.get("x-shopify-shop-domain");

  if (!hmac || !topic || !shopDomain) {
    return NextResponse.json(
      { error: "必須ヘッダーが不足しています" },
      { status: 400 },
    );
  }

  // shop_domainからテナント+webhook_secretを取得
  const { data: integration } = await supabaseAdmin
    .from("ec_integrations")
    .select("tenant_id, webhook_secret")
    .eq("shop_domain", shopDomain)
    .eq("platform", "shopify")
    .eq("is_active", true)
    .maybeSingle();

  if (!integration?.webhook_secret) {
    return NextResponse.json(
      { error: "不明なショップドメインです" },
      { status: 404 },
    );
  }

  // HMAC署名検証
  if (!verifyShopifyWebhook(body, hmac, integration.webhook_secret)) {
    return NextResponse.json(
      { error: "署名検証に失敗しました" },
      { status: 401 },
    );
  }

  const tenantId = integration.tenant_id;
  const payload = JSON.parse(body);

  try {
    switch (topic) {
      case "checkouts/create":
      case "checkouts/update":
        // カゴ落ち候補として登録
        await handleCheckout(tenantId, payload);
        break;
      case "orders/create":
        // 注文作成 → カゴ落ちを回収済みにマーク
        await handleOrderCreated(tenantId, payload);
        break;
      case "orders/fulfilled":
        // 発送完了 → LINE通知
        await handleOrderFulfilled(tenantId, payload);
        break;
      default:
        console.log(`[shopify-webhook] 未対応のトピック: ${topic}`);
    }

    // last_synced_at更新
    await supabaseAdmin
      .from("ec_integrations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("platform", "shopify");

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[shopify-webhook] Error:", e);
    return NextResponse.json(
      { error: "Webhook処理中にエラーが発生しました" },
      { status: 500 },
    );
  }
}

// --- チェックアウト（カゴ落ち候補）処理 ---
async function handleCheckout(tenantId: string, checkout: Record<string, unknown>) {
  const email = checkout.email as string | undefined;
  const phone = checkout.phone as string | undefined;

  // LINE UIDを患者テーブルから逆引き（emailかphoneで）
  let patient: { id: number; line_id: string | null } | null = null;
  if (email) {
    const { data } = await supabaseAdmin
      .from("patients")
      .select("id, line_id")
      .eq("email", email)
      .maybeSingle();
    patient = data;
  }
  if (!patient && phone) {
    const { data } = await supabaseAdmin
      .from("patients")
      .select("id, line_id")
      .eq("tel", phone)
      .maybeSingle();
    patient = data;
  }

  const lineItems = (checkout.line_items || []) as Array<Record<string, unknown>>;
  const cartItems = lineItems.map((item) => ({
    name: item.title as string,
    price: parseFloat(String(item.price)) || 0,
    quantity: (item.quantity as number) || 1,
    image_url: (item.image as Record<string, unknown>)?.src || null,
  }));

  const cartTotal = cartItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0,
  );

  // abandoned_cartsにINSERT（checkoutは新規作成ごとに1レコード）
  await supabaseAdmin.from("abandoned_carts").insert({
    tenant_id: tenantId,
    patient_id: patient?.id || null,
    line_uid: patient?.line_id || null,
    cart_items: cartItems,
    cart_total: Math.round(cartTotal),
    abandoned_at: new Date().toISOString(),
    reminder_count: 0,
    source: "shopify",
  });
}

// --- 注文作成 → カゴ落ち回収済みマーク ---
async function handleOrderCreated(tenantId: string, order: Record<string, unknown>) {
  const email = order.email as string | undefined;
  if (!email) return;

  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("id")
    .eq("email", email)
    .maybeSingle();

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
async function handleOrderFulfilled(tenantId: string, order: Record<string, unknown>) {
  const email = order.email as string | undefined;
  if (!email) return;

  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("id, line_id")
    .eq("email", email)
    .maybeSingle();

  if (!patient?.line_id) return;

  const fulfillments = order.fulfillments as Array<Record<string, unknown>> | undefined;
  const fulfillment = fulfillments?.[0] as Record<string, unknown> | undefined;
  const trackingNumber = (fulfillment?.tracking_number as string) || undefined;
  const trackingUrl = (fulfillment?.tracking_url as string) || undefined;
  const carrier = (fulfillment?.tracking_company as string) || undefined;

  // 注文商品リストを抽出
  const lineItems = (order.line_items || []) as Array<Record<string, unknown>>;
  const items = lineItems.map((item) => ({
    name: (item.title as string) || "商品",
    quantity: (item.quantity as number) || 1,
  }));

  // 注文番号
  const orderNumber = order.name as string | undefined;

  // Flex Messageで発送通知送信
  const flexMessage = buildShippingNotifyMessage({
    orderNumber,
    items: items.length > 0 ? items : [{ name: "ご注文の商品", quantity: 1 }],
    trackingNumber,
    trackingUrl,
    carrier,
  });

  await pushMessage(patient.line_id, [flexMessage], tenantId);

  // メッセージログINSERT（必須）
  await supabaseAdmin.from("message_log").insert({
    ...tenantPayload(tenantId),
    patient_id: patient.id,
    line_uid: patient.line_id,
    message_type: "shipping_notify",
    content: "発送通知",
    status: "sent",
    direction: "outgoing",
  });
}
