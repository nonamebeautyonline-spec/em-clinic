// lib/webhook-handlers/square.ts — Square Webhook業務ロジック（リプレイ対応）
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeJPPhone } from "@/lib/phone";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { invalidateDashboardCache } from "@/lib/redis";
import { markReorderPaid } from "@/lib/payment/square-inline";
import { getProductByCode } from "@/lib/products";
import { getBusinessRules } from "@/lib/business-rules";
import { sendPaymentThankNotification } from "@/lib/payment-thank-flex";
import { pushMessage } from "@/lib/line-push";

// --- 型定義 ---
export interface SquareRefund {
  id?: string;
  payment_id?: string;
  status?: string;
  amount_money?: { amount?: number; currency?: string };
  updated_at?: string;
  created_at?: string;
}

export interface SquarePayment {
  id?: string;
  status?: string;
  order_id?: string;
  customer_id?: string;
  note?: string;
  payment_note?: string;
  amount_money?: { amount?: number; currency?: string };
  buyer_email_address?: string;
  receipt_email?: string;
  billing_address?: { first_name?: string; last_name?: string };
  card_details?: { card?: { cardholder_name?: string } };
  created_at?: string;
}

export interface SquareEvent {
  type?: string;
  event_id?: string;
  id?: string;
  data?: {
    object?: {
      refund?: SquareRefund;
      payment?: SquarePayment;
    };
  };
}

interface SquareLineItem { name?: string; quantity?: string }
interface SquareAddress { postal_code?: string; administrative_district_level_1?: string; locality?: string; address_line_1?: string; address_line_2?: string }
interface SquareRecipient { display_name?: string; phone_number?: string; email_address?: string; address?: SquareAddress }
interface SquareFulfillment { shipment_details?: { recipient?: SquareRecipient } }
interface SquareOrder { line_items?: SquareLineItem[]; fulfillments?: SquareFulfillment[] }
interface SquareCustomer { email_address?: string; phone_number?: string }

// --- Square APIヘルパー ---
async function squareGet(path: string, token: string, squareEnv: string) {
  const baseUrl = squareEnv === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
  const res = await fetch(baseUrl + path, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, "Square-Version": "2024-04-17", Accept: "application/json" },
    cache: "no-store",
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { /* ignore */ }
  return { ok: res.ok, status: res.status, json, text };
}

async function squarePost(path: string, body: Record<string, unknown>, token: string, squareEnv: string) {
  const baseUrl = squareEnv === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
  const res = await fetch(baseUrl + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Square-Version": "2024-04-17", Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { /* ignore */ }
  return { ok: res.ok, status: res.status, json, text };
}

export function extractFromNote(note: string) {
  const out = { patientId: "", productCode: "", reorderId: "" };
  const n = note || "";
  const pid = n.match(/PID:([^;]+)/);
  if (pid?.[1]) out.patientId = pid[1].trim();
  const prod = n.match(/Product:([^\s(]+)/);
  if (prod?.[1]) out.productCode = prod[1].trim();
  const re = n.match(/Reorder:([^;]+)/);
  if (re?.[1]) out.reorderId = re[1].trim();
  return out;
}

// --- 業務ロジック ---

export interface SquareHandlerParams {
  event: SquareEvent;
  tenantId: string | null;
  squareToken: string;
  squareEnv: string;
}

/**
 * Square Webhook業務ロジック（リプレイ可能）
 * 署名検証・冪等チェックの外側で呼ぶ純粋な業務処理
 */
export async function processSquareEvent(params: SquareHandlerParams): Promise<void> {
  const { event, tenantId, squareToken, squareEnv } = params;
  const tid = tenantId ?? undefined;
  const eventType = String(event?.type || "");

  // ---- refund ----
  if (eventType === "refund.created" || eventType === "refund.updated") {
    const refund = event?.data?.object?.refund;
    const paymentId = String(refund?.payment_id || "");
    if (!paymentId) return;

    const refundStatus = String(refund?.status || "");
    const refundedAmount = refund?.amount_money?.amount != null ? String(refund.amount_money.amount) : "";
    const refundedAtIso = String(refund?.updated_at || refund?.created_at || "");

    try {
      const { error: updateErr } = await withTenant(
        supabaseAdmin
          .from("orders")
          .update({
            refund_status: refundStatus || "COMPLETED",
            refunded_amount: refundedAmount ? parseFloat(refundedAmount) : null,
            refunded_at: refundedAtIso || new Date().toISOString(),
            ...(refundStatus === "COMPLETED" ? { status: "refunded" } : {}),
          })
          .eq("id", paymentId),
        tenantId,
      );
      if (updateErr) {
        console.error("[square/handler] refund update failed:", updateErr);
      }
    } catch (e) {
      console.error("[square/handler] refund Supabase error:", e);
    }

    // キャッシュ削除
    try {
      const pRes = await squareGet(`/v2/payments/${encodeURIComponent(paymentId)}`, squareToken, squareEnv);
      if (pRes.ok) {
        const P = (pRes.json?.payment ?? {}) as SquarePayment;
        const note = String(P?.note || P?.payment_note || "");
        const { patientId } = extractFromNote(note);
        if (patientId) await invalidateDashboardCache(patientId);
      }
    } catch (error) {
      console.error("Failed to invalidate cache on refund:", error);
    }
    return;
  }

  // ---- payment ----
  if (eventType === "payment.created" || eventType === "payment.updated") {
    const pay = event?.data?.object?.payment;
    const paymentId = String(pay?.id || "");
    if (!paymentId) return;

    const status = String(pay?.status || "");
    if (status && status !== "COMPLETED") return;

    const pRes = await squareGet(`/v2/payments/${encodeURIComponent(paymentId)}`, squareToken, squareEnv);
    if (!pRes.ok) {
      console.error("[square/handler] Failed to get payment details:", paymentId);
      return;
    }

    const P = (pRes.json?.payment ?? {}) as SquarePayment;
    const note = String(P?.note || P?.payment_note || "");
    const { patientId, productCode, reorderId } = extractFromNote(note);

    if (reorderId) {
      await markReorderPaid(reorderId, patientId, tenantId);
      if (patientId && productCode) {
        try {
          await createReorderPaymentKarte(patientId, productCode, new Date().toISOString(), undefined, tenantId ?? undefined);
        } catch (karteErr) {
          console.error("[square/handler] reorder payment karte error:", karteErr);
        }
      }
    }

    const createdAtIso = String(P?.created_at || "");
    const orderId = String(P?.order_id || "");
    const customerId = String(P?.customer_id || "");
    const amountText = P?.amount_money?.amount != null ? String(P.amount_money.amount) : "";
    let email = String(P?.buyer_email_address || P?.receipt_email || "").trim();
    let phone = "";
    let billingName = "";

    try {
      const ba = P?.billing_address;
      if (ba) {
        const parts = [ba.first_name, ba.last_name].filter(Boolean);
        billingName = parts.join(" ").trim();
      }
      const card = P?.card_details?.card;
      if (!billingName && card?.cardholder_name) billingName = String(card.cardholder_name).trim();
    } catch (_) { /* ignore */ }

    let shipName = "";
    let postal = "";
    let address = "";
    let shipPhone = "";
    let itemsText = "";

    if (orderId) {
      const oRes = await squarePost(`/v2/orders/batch-retrieve`, { order_ids: [orderId] }, squareToken, squareEnv);
      const ordersArr = oRes.ok ? (oRes.json?.orders as SquareOrder[] | undefined) : undefined;
      const order = ordersArr?.[0] ?? null;

      if (order) {
        if (Array.isArray(order.line_items) && order.line_items.length) {
          itemsText = order.line_items
            .filter((li) => li?.name)
            .map((li) => `${li.name} x ${li?.quantity || "1"}`.trim())
            .join(" / ");
        }
        const f0 = Array.isArray(order.fulfillments) && order.fulfillments[0] ? order.fulfillments[0] : null;
        const rec = f0?.shipment_details?.recipient || null;
        if (rec) {
          if (rec.display_name) shipName = String(rec.display_name).trim();
          if (rec.phone_number) shipPhone = String(rec.phone_number).trim();
          const recEmail = rec.email_address ? String(rec.email_address).trim() : "";
          if (!email && recEmail) email = recEmail;
          const addr = rec.address || {} as SquareAddress;
          postal = String(addr.postal_code || "").trim();
          const addrParts = [addr.administrative_district_level_1, addr.locality, addr.address_line_1, addr.address_line_2].filter(Boolean);
          address = addrParts.join("").trim();
        }
      }
    }

    if (customerId && (!email || (!shipPhone && !phone))) {
      const cRes = await squareGet(`/v2/customers/${encodeURIComponent(customerId)}`, squareToken, squareEnv);
      const C: SquareCustomer = cRes.ok ? ((cRes.json?.customer ?? {}) as SquareCustomer) : {};
      if (!email && C?.email_address) email = String(C.email_address).trim();
      if (!shipPhone && C?.phone_number) phone = String(C.phone_number).trim();
    }

    const finalPhone = normalizeJPPhone(shipPhone || phone);
    const finalEmail = (email || "").trim();

    let existingOrder: Record<string, unknown> | null = null;
    if (patientId) {
      try {
        const { data: _existing } = await withTenant(
          supabaseAdmin
            .from("orders")
            .select("id, tracking_number, shipping_date, shipping_status")
            .eq("id", paymentId),
          tenantId,
        ).maybeSingle();
        existingOrder = _existing;

        if (existingOrder) {
          const { error } = await withTenant(
            supabaseAdmin
              .from("orders")
              .update({
                patient_id: patientId,
                product_code: productCode || null,
                ...(itemsText ? { product_name: itemsText } : {}),
                amount: amountText ? parseFloat(amountText) : 0,
                paid_at: createdAtIso || new Date().toISOString(),
                payment_status: "COMPLETED",
                payment_method: "credit_card",
                status: "confirmed",
                ...(!existingOrder.tracking_number && shipName ? { shipping_name: shipName } : {}),
                ...(!existingOrder.tracking_number && postal ? { postal_code: postal } : {}),
                ...(!existingOrder.tracking_number && address ? { address } : {}),
                ...(!existingOrder.tracking_number && finalPhone ? { phone: finalPhone } : {}),
                ...(!existingOrder.tracking_number && finalEmail ? { email: finalEmail } : {}),
              })
              .eq("id", paymentId),
            tenantId,
          );
          if (error) console.error("[square/handler] Supabase update failed:", error);
        } else {
          let resolvedProductName = itemsText || null;
          if (!resolvedProductName && productCode) {
            const p = await getProductByCode(productCode, tid);
            resolvedProductName = p?.title || productCode;
          }
          const { error } = await supabaseAdmin.from("orders").insert({
            id: paymentId,
            patient_id: patientId,
            product_code: productCode || null,
            product_name: resolvedProductName,
            amount: amountText ? parseFloat(amountText) : 0,
            paid_at: createdAtIso || new Date().toISOString(),
            shipping_status: "pending",
            payment_status: "COMPLETED",
            payment_method: "credit_card",
            status: "confirmed",
            shipping_name: shipName || null,
            postal_code: postal || null,
            address: address || null,
            phone: finalPhone || null,
            email: finalEmail || null,
            ...tenantPayload(tenantId),
          });
          if (error) console.error("[square/handler] Supabase insert failed:", error);
        }
      } catch (err) {
        console.error("[square/handler] Supabase error:", err);
      }
    }

    // 決済完了サンクスFlex送信
    // inline決済（/api/square/pay）で既に注文INSERT済みの場合はそちらで通知済みなのでスキップ
    // hosted checkout（Payment Links）からの決済のみwebhookで通知を送る
    if (patientId && !existingOrder) {
      try {
        const rules = await getBusinessRules(tenantId ?? undefined);
        if (rules.notifyReorderPaid) {
          const thankMsg = rules.paymentThankMessageCard || "お支払いありがとうございます。発送準備を進めてまいります。";
          const { data: pt } = await withTenant(
            supabaseAdmin.from("patients").select("line_id").eq("patient_id", patientId).maybeSingle(),
            tenantId
          );
          if (pt?.line_id) {
            await sendPaymentThankNotification({
              patientId, lineUid: pt.line_id,
              message: thankMsg,
              shipping: { shippingName: shipName, postalCode: postal, address, phone: finalPhone, email: finalEmail },
              paymentMethod: "credit_card",
              productName: itemsText || undefined,
              amount: amountText ? parseFloat(amountText) : undefined,
              tenantId: tenantId ?? undefined,
            });
          }
        }
      } catch (thankErr) {
        console.error("[square/handler] payment thank message error:", thankErr);
      }
    }

    // ポイント自動付与
    if (patientId) {
      try {
        const { processAutoGrant } = await import("@/lib/point-auto-grant");
        const amountNum = amountText ? parseFloat(amountText) : 0;
        await processAutoGrant(tenantId || "", patientId, paymentId, amountNum);
      } catch (e) {
        console.error("[square/handler] point auto-grant failed:", e);
      }
    }

    if (patientId) {
      await invalidateDashboardCache(patientId);
    }
  }
}
