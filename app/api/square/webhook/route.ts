import { NextResponse } from "next/server";
import crypto from "crypto";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeJPPhone } from "@/lib/phone";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

export const runtime = "nodejs";


async function markReorderPaid(reorderId: string, patientId?: string, tenantId: string | null = null) {
const idNum = Number(String(reorderId).trim());
if (!Number.isFinite(idNum) || idNum < 2) {
  console.error("invalid reorderId for paid:", reorderId);
  return;
}

  // ★ Supabase更新（reorder_numberでマッチング → ダメなら id でフォールバック）
  try {
    const paidPayload = { status: "paid" as const, paid_at: new Date().toISOString() };

    // 1) reorder_number で更新を試みる
    let query = withTenant(
      supabaseAdmin
        .from("reorders")
        .update(paidPayload)
        .eq("reorder_number", idNum)
        .eq("status", "confirmed"),
      tenantId
    );
    if (patientId) query = query.eq("patient_id", patientId);

    const { data: updated, error: dbError } = await query.select("id");

    if (dbError) {
      console.error("[square/webhook] Supabase reorder paid error:", dbError);
    } else if (updated && updated.length > 0) {
      console.log(`[square/webhook] Supabase reorder paid success (reorder_number), row=${idNum}`);
    } else {
      // 2) reorder_number でヒットしなかった場合、id（SERIAL PK）でフォールバック
      //    フロント側で reorder_number が欠落して id が渡されたケースを救済
      console.warn(`[square/webhook] reorder_number=${idNum} matched 0 rows, trying id fallback`);
      let fallback = withTenant(
        supabaseAdmin
          .from("reorders")
          .update(paidPayload)
          .eq("id", idNum)
          .eq("status", "confirmed"),
        tenantId
      );
      if (patientId) fallback = fallback.eq("patient_id", patientId);

      const { data: fb, error: fbErr } = await fallback.select("id");
      if (fbErr) {
        console.error("[square/webhook] Supabase reorder paid fallback error:", fbErr);
      } else if (fb && fb.length > 0) {
        console.log(`[square/webhook] Supabase reorder paid success (id fallback), id=${idNum}`);
      } else {
        console.warn(`[square/webhook] Supabase reorder paid: no rows matched (reorder_num=${idNum}, id=${idNum})`);
      }
    }
  } catch (dbErr) {
    console.error("[square/webhook] Supabase reorder paid exception:", dbErr);
  }
}


function timingSafeEqual(a: string, b: string) {
  const abuf = Buffer.from(a, "utf8");
  const bbuf = Buffer.from(b, "utf8");
  if (abuf.length !== bbuf.length) return false;
  return crypto.timingSafeEqual(abuf, bbuf);
}

/**
 * Square Webhook Signature verification
 * header: x-square-hmacsha1-signature
 * expected: base64( HMAC-SHA1( key, notificationUrl + body ) )
 */
function verifySquareSignature(params: {
  signatureKey: string;
  signatureHeader: string | null;
  notificationUrl: string;
  body: string;
}) {
  const { signatureKey, signatureHeader, notificationUrl, body } = params;
  if (!signatureKey) return true; // 段階導入：未設定ならスキップ可能
  if (!signatureHeader) return false;

  const payload = notificationUrl + body;
  const digest = crypto.createHmac("sha1", signatureKey).update(payload, "utf8").digest("base64");
  return timingSafeEqual(digest, signatureHeader);
}

async function squareGet(path: string, token: string, squareEnv: string) {
  const baseUrl = squareEnv === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";

  const res = await fetch(baseUrl + path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Square-Version": "2024-04-17",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) {}

  return { ok: res.ok, status: res.status, json, text };
}

async function squarePost(path: string, body: any, token: string, squareEnv: string) {
  const baseUrl = squareEnv === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";

  const res = await fetch(baseUrl + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Square-Version": "2024-04-17",
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) {}

  return { ok: res.ok, status: res.status, json, text };
}

// normalizeJPPhone は @/lib/phone からimport

function extractFromNote(note: string) {
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

export async function GET() {
  return new NextResponse("ok", { status: 200 });
}

export async function POST(req: Request) {
  const bodyText = await req.text();
  const tenantId = resolveTenantId(req);
  const tid = tenantId ?? undefined;

  // Square設定を動的取得
  const signatureKey = (await getSettingOrEnv("square", "webhook_signature_key", "SQUARE_WEBHOOK_SIGNATURE_KEY", tid)) || "";
  const squareToken = (await getSettingOrEnv("square", "access_token", "SQUARE_ACCESS_TOKEN", tid)) || "";
  const squareEnv = (await getSettingOrEnv("square", "env", "SQUARE_ENV", tid)) || "production";

  // 署名検証（暫定：ヘッダ無しは通す）
  const signatureHeader = req.headers.get("x-square-hmacsha1-signature");

  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  const verifyUrl = (notificationUrl || req.url.split("?")[0]).trim();

  // ---- Signature check (temporary allow when header missing) ----
  if (signatureKey && !signatureHeader) {
    console.error("Square signature header missing; accepting temporarily", {
      verifyUrl,
      bodyLen: bodyText.length,
      keyLen: signatureKey.length,
    });
    // skip
  } else if (signatureKey) {
    const payload = verifyUrl + bodyText;
    const expected = crypto.createHmac("sha1", signatureKey).update(payload, "utf8").digest("base64");
    const ok = timingSafeEqual(expected, signatureHeader || "");
    if (!ok) {
      console.error("Square signature mismatch", {
        expected,
        got: signatureHeader,
        verifyUrl,
        bodyLen: bodyText.length,
        keyLen: signatureKey.length,
      });
      return new NextResponse("unauthorized", { status: 401 });
    }
  }
  // --------------------------------------------------------------

  // Squareへのレスポンスは最終的に200固定で返す（Square停止回避）
  let event: any = null;
  try { event = JSON.parse(bodyText); } catch (_) {}

  const eventType = String(event?.type || "");
  const eventId = String(event?.event_id || event?.id || "");

  try {
    // ---- refund ----
    if (eventType === "refund.created" || eventType === "refund.updated") {
      const refund = event?.data?.object?.refund;
      const paymentId = String(refund?.payment_id || "");
      if (!paymentId) return new NextResponse("ok", { status: 200 });

      const refundStatus = String(refund?.status || "");
      const refundedAmount = refund?.amount_money?.amount != null ? String(refund.amount_money.amount) : "";
      const refundId = String(refund?.id || "");
      const refundedAtIso = String(refund?.updated_at || refund?.created_at || "");

      // ★ Supabase ordersテーブルに返金情報を反映
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
          tenantId
        );
        if (updateErr) {
          console.error("[square/webhook] refund update failed:", updateErr);
        } else {
          console.log("[square/webhook] refund updated in orders:", paymentId, refundStatus);
        }
      } catch (e) {
        console.error("[square/webhook] refund Supabase error:", e);
      }

      // ★ キャッシュ削除（返金時：paymentからpatientIdを取得）
      try {
        const pRes = await squareGet(`/v2/payments/${encodeURIComponent(paymentId)}`, squareToken, squareEnv);
        if (pRes.ok) {
          const P = pRes.json?.payment || {};
          const note = String(P?.note || P?.payment_note || "");
          const { patientId } = extractFromNote(note);
          if (patientId) {
            await invalidateDashboardCache(patientId);
          }
        }
      } catch (error) {
        console.error("Failed to invalidate cache on refund:", error);
      }

      return new NextResponse("ok", { status: 200 });
    }

    // ---- payment ----
    if (eventType === "payment.created" || eventType === "payment.updated") {
      const pay = event?.data?.object?.payment;
      const paymentId = String(pay?.id || "");
      if (!paymentId) return new NextResponse("ok", { status: 200 });

      // statusがCOMPLETED以外なら無視
      const status = String(pay?.status || "");
      if (status && status !== "COMPLETED") {
        return new NextResponse("ok", { status: 200 });
      }

      // COMPLETED のときだけ Square API で詳細を作る
      const pRes = await squareGet(`/v2/payments/${encodeURIComponent(paymentId)}`, squareToken, squareEnv);
      if (!pRes.ok) {
        console.error("[square/webhook] Failed to get payment details:", paymentId);
        return new NextResponse("ok", { status: 200 });
      }

      const P = pRes.json?.payment || {};
      const note = String(P?.note || P?.payment_note || "");
      const { patientId, productCode, reorderId } = extractFromNote(note);

if (reorderId) {
  await markReorderPaid(reorderId, patientId, tenantId);

  // ★ 決済時カルテ自動作成（用量比較付き）
  if (patientId && productCode) {
    try {
      await createReorderPaymentKarte(patientId, productCode, new Date().toISOString(), undefined, tenantId ?? undefined);
    } catch (karteErr) {
      console.error("[square/webhook] reorder payment karte error:", karteErr);
    }
  }
}

      const createdAtIso = String(P?.created_at || "");
      const orderId = String(P?.order_id || "");
      const customerId = String(P?.customer_id || "");

      const amountText = (P?.amount_money?.amount != null) ? String(P.amount_money.amount) : "";
      let email = String(P?.buyer_email_address || P?.receipt_email || "").trim();
      let phone = "";
      let billingName = "";

      try {
        // billing name
        const ba = P?.billing_address;
        if (ba) {
          const parts = [ba.first_name, ba.last_name].filter(Boolean);
          billingName = parts.join(" ").trim();
        }
        const card = P?.card_details?.card;
        if (!billingName && card?.cardholder_name) billingName = String(card.cardholder_name).trim();
      } catch (_) {}

      // order から配送先・itemsを取る（customerは必要になったらだけ）
      let shipName = "";
      let postal = "";
      let address = "";
      let shipPhone = "";
      let itemsText = "";

      if (orderId) {
        const oRes = await squarePost(`/v2/orders/batch-retrieve`, { order_ids: [orderId] }, squareToken, squareEnv);
        const order = oRes.ok ? (oRes.json?.orders?.[0] || null) : null;

        if (order) {
          // items
          if (Array.isArray(order.line_items) && order.line_items.length) {
            itemsText = order.line_items
              .map((li: any) => `${li?.name || ""} x ${li?.quantity || "1"}`.trim())
              .filter(Boolean)
              .join(" / ");
          }

          // shipment recipient
          const f0 = Array.isArray(order.fulfillments) && order.fulfillments[0] ? order.fulfillments[0] : null;
          const rec = f0?.shipment_details?.recipient || null;

          if (rec) {
            if (rec.display_name) shipName = String(rec.display_name).trim();
            if (rec.phone_number) shipPhone = String(rec.phone_number).trim();
            const recEmail = rec.email_address ? String(rec.email_address).trim() : "";
            if (!email && recEmail) email = recEmail;

            const addr = rec.address || {};
            postal = String(addr.postal_code || "").trim();
            const parts = [
              addr.administrative_district_level_1,
              addr.locality,
              addr.address_line_1,
              addr.address_line_2,
            ].filter(Boolean);
            address = parts.join("").trim();
          }
        }
      }

      // customer は “email/phone不足時のみ” 補完
      if (customerId && (!email || (!shipPhone && !phone))) {
        const cRes = await squareGet(`/v2/customers/${encodeURIComponent(customerId)}`, squareToken, squareEnv);
        const C = cRes.ok ? (cRes.json?.customer || {}) : {};
        if (!email && C?.email_address) email = String(C.email_address).trim();
        if (!shipPhone && C?.phone_number) phone = String(C.phone_number).trim();
      }

      const finalPhone = normalizeJPPhone(shipPhone || phone);
      const finalEmail = (email || "").trim();

      // ★ Supabase ordersテーブルにINSERT（マイページ用 + 発送管理用）
      // 重要: 既存の注文がある場合、shipping情報（tracking_number, shipping_date, shipping_status）を上書きしない
      if (patientId) {
        try {
          // 既存の注文を確認
          const { data: existingOrder } = await withTenant(
            supabaseAdmin
              .from("orders")
              .select("id, tracking_number, shipping_date, shipping_status")
              .eq("id", paymentId),
            tenantId
          ).maybeSingle();

          if (existingOrder) {
            // 既存の注文がある場合は、shipping情報を保持してその他の情報のみ更新
            const { error } = await withTenant(
              supabaseAdmin
                .from("orders")
                .update({
                  patient_id: patientId,
                  product_code: productCode || null,
                  product_name: itemsText || null,
                  amount: amountText ? parseFloat(amountText) : 0,
                  paid_at: createdAtIso || new Date().toISOString(),
                  payment_status: "COMPLETED",
                  payment_method: "credit_card",
                  status: "confirmed",
                  // shipping_status, tracking_number, shipping_date は保持（上書きしない）
                  // 住所情報は既存のtracking_numberがなければ更新
                  ...(!existingOrder.tracking_number && shipName ? { shipping_name: shipName } : {}),
                  ...(!existingOrder.tracking_number && postal ? { postal_code: postal } : {}),
                  ...(!existingOrder.tracking_number && address ? { address: address } : {}),
                  ...(!existingOrder.tracking_number && finalPhone ? { phone: finalPhone } : {}),
                  ...(!existingOrder.tracking_number && finalEmail ? { email: finalEmail } : {}),
                })
                .eq("id", paymentId),
              tenantId
            );

            if (error) {
              console.error("[square/webhook] Supabase update failed:", error);
            } else {
              console.log("[square/webhook] Supabase order updated (shipping preserved):", paymentId);
            }
          } else {
            // 新規注文の場合はINSERT
            const { error } = await supabaseAdmin.from("orders").insert({
              id: paymentId,
              patient_id: patientId,
              product_code: productCode || null,
              product_name: itemsText || null,
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

            if (error) {
              console.error("[square/webhook] Supabase insert failed:", error);
            } else {
              console.log("[square/webhook] Supabase order inserted:", paymentId);
            }
          }
        } catch (err) {
          console.error("[square/webhook] Supabase error:", err);
        }
      }

      // ★ キャッシュ削除（決済完了時）
      if (patientId) {
        await invalidateDashboardCache(patientId);
      }

      return new NextResponse("ok", { status: 200 });
    }

    // その他イベントは無視
    return new NextResponse("ok", { status: 200 });

  } catch (err: any) {
    console.error("webhook handler error:", err?.stack || err?.message || err);
    // Squareには200返して止められないようにする（後でバックフィル）
    return new NextResponse("ok", { status: 200 });
  }
}
export {};
