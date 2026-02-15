// app/api/square/backfill-refunds/route.ts
// ★ GAS連携撤去済み: GAS_UPSERT_URLへの送信を廃止、Supabase ordersテーブルへの返金反映のみ
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

export const runtime = "nodejs";

function isoFix(v: string | null) {
  return (v || "").trim().replaceAll(" ", "+");
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
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { ok: res.ok, status: res.status, json, text };
}

export async function GET(req: Request) {
  try {
    const tenantId = resolveTenantId(req);
    const tid = tenantId ?? undefined;

    const squareToken = (await getSettingOrEnv("square", "access_token", "SQUARE_ACCESS_TOKEN", tid)) || "";
    const squareEnv = (await getSettingOrEnv("square", "env", "SQUARE_ENV", tid)) || "production";

    if (!squareToken) {
      return NextResponse.json({ ok: false, error: "SQUARE_ACCESS_TOKEN not set" }, { status: 500 });
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

      const rRes = await squareGet(`/v2/refunds?${qs.toString()}`, squareToken, squareEnv);
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

        const refundStatus = String(r?.status || "");
        const refundAmount = (r?.amount_money?.amount != null) ? parseFloat(String(r.amount_money.amount)) : null;
        const refundedAt = String(r?.updated_at || r?.created_at || "");
        const refundId = String(r?.id || "");

        // Supabase ordersテーブルに返金情報を反映
        let dbStatus = "skipped";
        try {
          const { error: updateErr } = await withTenant(
            supabaseAdmin
              .from("orders")
              .update({
                refund_status: refundStatus || "COMPLETED",
                refunded_amount: refundAmount,
                refunded_at: refundedAt || new Date().toISOString(),
                ...(refundStatus === "COMPLETED" ? { status: "refunded" } : {}),
              })
              .eq("id", paymentId),
            tenantId
          );
          dbStatus = updateErr ? `error: ${updateErr.message}` : "ok";
        } catch (e: any) {
          dbStatus = `error: ${e?.message || String(e)}`;
        }

        results.push({
          payment_id: paymentId,
          refund_id: refundId,
          status: refundStatus,
          db_status: dbStatus,
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
