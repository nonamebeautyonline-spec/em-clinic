import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isoOrEmpty(v: string | null) {
  if (!v) return "";
  const s = String(v).trim();
  return s;
}

function normalizeJPPhone(raw: string) {
  const s = (raw || "").trim();
  if (!s) return "";
  let digits = s.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("81")) {
    const rest = digits.slice(2);
    digits = "0" + rest;
  }
  if (!digits.startsWith("0") && /^(70|80|90)/.test(digits)) digits = "0" + digits;
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

async function postToGas(payload: any) {
  const gasUrl = process.env.GAS_UPSERT_URL!;
  const res = await fetch(gasUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, text };
}

async function upsertCompletedPayment(paymentId: string) {
  // 1) payment detail
  const pRes = await squareGet(`/v2/payments/${encodeURIComponent(paymentId)}`);
  if (!pRes.ok) return { ok: false, reason: `payment_get_${pRes.status}` };

  const P = pRes.json?.payment || {};
  const status = String(P?.status || "");
  if (status !== "COMPLETED") {
    await postToGas({ kind: "payment_status", payment_id: paymentId, payment_status: status });
    return { ok: true, kind: "status_only", status };
  }

  const note = String(P?.note || P?.payment_note || "");
  const { patientId, productCode, reorderId } = extractFromNote(note);

  const createdAtIso = String(P?.created_at || "");
  const orderId = String(P?.order_id || "");
  const customerId = String(P?.customer_id || "");
  const amountText = (P?.amount_money?.amount != null) ? String(P.amount_money.amount) : "";

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
  } catch (_) {}

  let shipName = "";
  let postal = "";
  let address = "";
  let shipPhone = "";
  let itemsText = "";

  if (orderId) {
    const oRes = await squarePost(`/v2/orders/batch-retrieve`, { order_ids: [orderId] });
    const order = oRes.ok ? (oRes.json?.orders?.[0] || null) : null;

    if (order) {
      if (Array.isArray(order.line_items) && order.line_items.length) {
        itemsText = order.line_items
          .map((li: any) => `${li?.name || ""} x ${li?.quantity || "1"}`.trim())
          .filter(Boolean)
          .join(" / ");
      }

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

  // customer補完（不足時のみ）
  if (customerId && (!email || (!shipPhone && !phone))) {
    const cRes = await squareGet(`/v2/customers/${encodeURIComponent(customerId)}`);
    const C = cRes.ok ? (cRes.json?.customer || {}) : {};
    if (!email && C?.email_address) email = String(C.email_address).trim();
    if (!shipPhone && C?.phone_number) phone = String(C.phone_number).trim();
  }

  const finalPhone = normalizeJPPhone(shipPhone || phone);
  const finalEmail = (email || "").trim();

  const gasPayload = {
    kind: "payment_completed",
    payment_id: paymentId,
    payment_status: "COMPLETED",
    created_at_iso: createdAtIso,
    order_id: orderId,
    order_datetime_iso: createdAtIso,
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
    reorder_id: reorderId,
  };

  const g = await postToGas(gasPayload);
  return { ok: true, kind: "completed", gas: g };
}

export async function GET(req: Request) {
  // 例:
  // /api/square/backfill?begin=2026-01-08T00:00:00Z&end=2026-01-08T23:59:59Z&limit=50
  // /api/square/backfill?begin=2026-01-08T00:00:00+09:00&end=2026-01-08T23:59:59+09:00

  const url = new URL(req.url);
  const begin = isoOrEmpty(url.searchParams.get("begin"));
  const end = isoOrEmpty(url.searchParams.get("end"));
  const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);

  if (!process.env.SQUARE_ACCESS_TOKEN) {
    return NextResponse.json({ ok: false, error: "SQUARE_ACCESS_TOKEN not set" }, { status: 500 });
  }
  if (!process.env.GAS_UPSERT_URL) {
    return NextResponse.json({ ok: false, error: "GAS_UPSERT_URL not set" }, { status: 500 });
  }

  // List payments
  // Square: /v2/payments?begin_time=...&end_time=...&sort_order=ASC&limit=100&cursor=...
  let cursor = "";
  let processed = 0;
  const results: any[] = [];

  while (processed < limit) {
    const qs = new URLSearchParams();
    if (begin) qs.set("begin_time", begin);
    if (end) qs.set("end_time", end);
    qs.set("sort_order", "ASC");
    qs.set("limit", "100");
    if (cursor) qs.set("cursor", cursor);

    const listRes = await squareGet(`/v2/payments?${qs.toString()}`);
    if (!listRes.ok) {
      return NextResponse.json(
        { ok: false, error: "list_payments_failed", status: listRes.status, body: listRes.text?.slice(0, 500) },
        { status: 500 }
      );
    }

    const payments = listRes.json?.payments || [];
    for (const p of payments) {
      if (processed >= limit) break;
      const pid = String(p?.id || "");
      if (!pid) continue;

      // COMPLETED以外はスキップしたいならここで絞る（今はCOMPLETEDだけ詳細UPSERT）
      const st = String(p?.status || "");
      if (st !== "COMPLETED") continue;

      const one = await upsertCompletedPayment(pid);
      results.push({ payment_id: pid, status: st, result: one });
      processed++;
    }

    cursor = String(listRes.json?.cursor || "");
    if (!cursor) break;
  }

  return NextResponse.json({ ok: true, processed, begin, end, results }, { status: 200 });
}
