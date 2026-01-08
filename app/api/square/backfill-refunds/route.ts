import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isoFix(v: string | null) {
  return (v || "").trim().replaceAll(" ", "+");
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
  try { json = text ? JSON.parse(text) : null; } catch {}
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

export async function GET(req: Request) {
  try {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      return NextResponse.json({ ok: false, error: "SQUARE_ACCESS_TOKEN not set" }, { status: 500 });
    }
    if (!process.env.GAS_UPSERT_URL) {
      return NextResponse.json({ ok: false, error: "GAS_UPSERT_URL not set" }, { status: 500 });
    }

    const url = new URL(req.url);
    const begin = isoFix(url.searchParams.get("begin"));
    const end = isoFix(url.searchParams.get("end"));
    const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);

    if (!begin || !end) {
      return NextResponse.json({ ok: false, error: "begin and end are required" }, { status: 400 });
    }

    let cursor = "";
    let processed = 0;
    const results: any[] = [];

    while (processed < limit) {
      const qs = new URLSearchParams();
      qs.set("begin_time", begin);
      qs.set("end_time", end);
      qs.set("sort_order", "ASC");
      qs.set("limit", "100");
      if (cursor) qs.set("cursor", cursor);

      const rRes = await squareGet(`/v2/refunds?${qs.toString()}`);
      if (!rRes.ok) {
        return NextResponse.json(
          { ok: false, error: "list_refunds_failed", status: rRes.status, body: rRes.text?.slice(0, 500) },
          { status: 500 }
        );
      }

      const refunds = rRes.json?.refunds || [];
      for (const r of refunds) {
        if (processed >= limit) break;

        const paymentId = String(r?.payment_id || "");
        if (!paymentId) continue;

        const payload = {
          kind: "refund",
          payment_id: paymentId,
          refund_status: String(r?.status || ""),
          refunded_amount: (r?.amount_money?.amount != null) ? String(r.amount_money.amount) : "",
          refunded_at_iso: String(r?.updated_at || r?.created_at || ""),
          refund_id: String(r?.id || ""),
          raw_event_type: "refund.backfill",
        };

        const g = await postToGas(payload);
        results.push({
          payment_id: paymentId,
          refund_id: payload.refund_id,
          status: payload.refund_status,
          gas_status: g.status,
        });
        processed++;
      }

      cursor = String(rRes.json?.cursor || "");
      if (!cursor) break;
    }

    return NextResponse.json({ ok: true, processed, begin, end, results }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export {};
