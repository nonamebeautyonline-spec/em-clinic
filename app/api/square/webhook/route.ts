import { NextResponse } from "next/server";
import crypto from "crypto";
import { invalidateDashboardCache } from "@/lib/redis";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function markReorderPaidInGas(reorderId: string, patientId?: string) {
  const url = process.env.GAS_REORDER_URL; // 既存の /api/reorder/* が使ってるやつと同じ
  if (!url) {
    console.error("GAS_REORDER_URL not set; cannot mark reorder paid");
    return;
  }

const idNum = Number(String(reorderId).trim());
if (!Number.isFinite(idNum) || idNum < 2) {
  console.error("invalid reorderId for paid:", reorderId);
  return;
}


  try {
    // ★ GASで paid に更新
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "paid", id: idNum }),
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error("GAS reorder paid failed:", res.status, text);
    }
  } catch (e) {
    console.error("GAS reorder paid exception:", e);
  }

  // ★ Supabaseも更新（gas_row_numberでマッチング）
  try {
    let query = supabaseAdmin
      .from("reorders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("gas_row_number", idNum);

    // patient_idがあれば追加条件として使用（安全性向上）
    if (patientId) {
      query = query.eq("patient_id", patientId);
    }

    const { error: dbError } = await query;

    if (dbError) {
      console.error("[square/webhook] Supabase reorder paid error:", dbError);
    } else {
      console.log(`[square/webhook] Supabase reorder paid success, row=${idNum}`);
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

async function squareGet(path: string) {
  const token = process.env.SQUARE_ACCESS_TOKEN!;
  const env = process.env.SQUARE_ENV || "production";
  const baseUrl = env === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";

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

async function squarePost(path: string, body: any) {
  const token = process.env.SQUARE_ACCESS_TOKEN!;
  const env = process.env.SQUARE_ENV || "production";
  const baseUrl = env === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";

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

function normalizeJPPhone(raw: string) {
  const s = (raw || "").trim();
  if (!s) return "";
  let digits = s.replace(/[^\d]/g, "");
  if (!digits) return "";

  // ★ 0080/0090 を 080/090 に変換（国際電話プレフィックス00の誤入力）
  if (digits.startsWith("0080")) {
    digits = "080" + digits.slice(4);
  } else if (digits.startsWith("0090")) {
    digits = "090" + digits.slice(4);
  }
  // 00プレフィックスを削除（国際電話の発信コード）
  else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // 81（国際番号）を削除して0を追加
  if (digits.startsWith("81")) {
    digits = "0" + digits.slice(2);
  }

  // 先頭に0がなく、7/8/9で始まる場合は0を追加
  if (!digits.startsWith("0") && /^[789]/.test(digits)) {
    digits = "0" + digits;
  }

  return digits;
}

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

async function postToGas(payload: any) {
  const gasUrl = process.env.GAS_UPSERT_URL;
  if (!gasUrl) throw new Error("GAS_UPSERT_URL not set");

  const res = await fetch(gasUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, text };
}

export async function GET() {
  return new NextResponse("ok", { status: 200 });
}

export async function POST(req: Request) {
  const bodyText = await req.text();

// 署名検証（暫定：ヘッダ無しは通す）
const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "";
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

      // GASへ「返金更新」だけ送る（GASはUrlFetchしない）
      await postToGas({
        kind: "refund",
        event_id: eventId,
        payment_id: paymentId,
        refund_status: refundStatus,
        refunded_amount: refundedAmount,
        refunded_at_iso: refundedAtIso,
        refund_id: refundId,
        raw_event_type: eventType,
      });

      // ★ キャッシュ削除（返金時：paymentからpatientIdを取得）
      try {
        const pRes = await squareGet(`/v2/payments/${encodeURIComponent(paymentId)}`);
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

      // statusがCOMPLETED以外なら、最低限ステータスだけ送る（API叩かない）
      const status = String(pay?.status || "");
      if (status && status !== "COMPLETED") {
        await postToGas({
          kind: "payment_status",
          event_id: eventId,
          payment_id: paymentId,
          payment_status: status,
          raw_event_type: eventType,
        });
        return new NextResponse("ok", { status: 200 });
      }

      // COMPLETED のときだけ Square API で詳細を作る
      const pRes = await squareGet(`/v2/payments/${encodeURIComponent(paymentId)}`);
      if (!pRes.ok) {
        // 取れない場合もステータスだけ送っておく（後でバックフィルで埋まる）
        await postToGas({
          kind: "payment_status",
          event_id: eventId,
          payment_id: paymentId,
          payment_status: "COMPLETED",
          raw_event_type: eventType,
          note: "square_get_payment_failed",
        });
        return new NextResponse("ok", { status: 200 });
      }

      const P = pRes.json?.payment || {};
      const note = String(P?.note || P?.payment_note || "");
      const { patientId, productCode, reorderId } = extractFromNote(note);

if (reorderId) {
  await markReorderPaidInGas(reorderId, patientId);
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
        const oRes = await squarePost(`/v2/orders/batch-retrieve`, { order_ids: [orderId] });
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
        const cRes = await squareGet(`/v2/customers/${encodeURIComponent(customerId)}`);
        const C = cRes.ok ? (cRes.json?.customer || {}) : {};
        if (!email && C?.email_address) email = String(C.email_address).trim();
        if (!shipPhone && C?.phone_number) phone = String(C.phone_number).trim();
      }

      const finalPhone = normalizeJPPhone(shipPhone || phone);
      const finalEmail = (email || "").trim();

      await postToGas({
        kind: "payment_completed",
        event_id: eventId,
        raw_event_type: eventType,
        payment_id: paymentId,
        created_at_iso: createdAtIso,
        order_id: orderId,
        payment_status: "COMPLETED",
        order_datetime_iso: createdAtIso, // GAS側でJST変換
        ship_name: shipName,
        postal,
        address,
        email: finalEmail,
        phone: finalPhone,
        items: itemsText,
        amount: amountText,
        billing_name: billingName,
        product_code: productCode,
        patient_id: patientId,
        reorder_id: reorderId, // 使うならGAS側で処理
      });

      // ★ Supabase ordersテーブルにINSERT（マイページ用 + 発送管理用）
      // 重要: 既存の注文がある場合、shipping情報（tracking_number, shipping_date, shipping_status）を上書きしない
      if (patientId) {
        try {
          // 既存の注文を確認
          const { data: existingOrder } = await supabase
            .from("orders")
            .select("id, tracking_number, shipping_date, shipping_status")
            .eq("id", paymentId)
            .maybeSingle();

          if (existingOrder) {
            // 既存の注文がある場合は、shipping情報を保持してその他の情報のみ更新
            const { error } = await supabase
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
              .eq("id", paymentId);

            if (error) {
              console.error("[square/webhook] Supabase update failed:", error);
            } else {
              console.log("[square/webhook] Supabase order updated (shipping preserved):", paymentId);
            }
          } else {
            // 新規注文の場合はINSERT
            const { error } = await supabase.from("orders").insert({
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
