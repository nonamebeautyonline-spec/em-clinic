// app/api/mypage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
export const dynamic = "force-dynamic";

type ShippingStatus = "pending" | "preparing" | "shipped" | "delivered";
type PaymentStatus = "paid" | "pending" | "failed" | "refunded";

type OrderForMyPage = {
  id: string;
  productCode: string;
  productName: string;
  amount: number;
  paidAt: string; // ISO
  shippingStatus: ShippingStatus;
  shippingEta?: string;
  trackingNumber?: string;
  paymentStatus: PaymentStatus;
};

type OrdersFlags = {
  canPurchaseCurrentCourse: boolean;
  canApplyReorder: boolean;
  hasAnyPaidOrder: boolean;
};

type HistoryForMyPage = {
  id: string;
  date: string;
  title: string;
  detail: string;
};

type GasDashboardResponse = {
  patient?: { id: string; displayName?: string; [k: string]: any };
  nextReservation?: { id: string; datetime: string; title: string; status: string } | null;
  orders?: {
    id: string;
    product_code: string;
    product_name: string;
    amount: number;
    paid_at_jst: string;
    shipping_status?: string;
    shipping_eta?: string;
    tracking_number?: string;
    payment_status?: string;
  }[];
  flags?: Partial<OrdersFlags>;
  reorders?: any[];
  history?: any[];
};

const noCacheHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function fail(code: string, status: number) {
  return NextResponse.json({ ok: false, error: code }, { status, headers: noCacheHeaders });
}

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function getCookieValue(name: string): string {
  const c = cookies().get(name);
  return c?.value ?? "";
}

export async function POST() {  try {
    if (!GAS_MYPAGE_URL) return fail("server_config_error", 500);

    const patientId =
      getCookieValue("__Host-patient_id") ||
      getCookieValue("patient_id");

    if (!patientId) return fail("unauthorized", 401);

    const lineUserId =
      getCookieValue("__Host-line_user_id") ||
      getCookieValue("line_user_id");

    // ★ 再訪時の回収：line_user_id を master に保存（awaitしない）
    if (lineUserId) {
      fetch(GAS_MYPAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "save_line_user_id",
          patient_id: patientId,
          line_user_id: lineUserId,
        }),
        cache: "no-store",
      }).catch(() => {});
    }

    const url =
      GAS_MYPAGE_URL +
      `?type=getDashboard&patient_id=${encodeURIComponent(patientId)}`;

    const gasRes = await fetch(url, { method: "GET", cache: "no-store" });
    const rawText = await gasRes.text().catch(() => "");

    if (!gasRes.ok) {
      console.error("GAS getDashboard HTTP error:", gasRes.status);
      return fail("gas_error", 500);
    }

    let gasJson: GasDashboardResponse;
    try {
      gasJson = JSON.parse(rawText) as GasDashboardResponse;
    } catch {
      console.error("GAS getDashboard JSON parse error");
      return fail("gas_invalid_json", 500);
    }

    const patient = gasJson.patient?.id ? { id: safeStr(gasJson.patient.id) } : undefined;

    const nextReservation = gasJson.nextReservation
      ? {
          id: safeStr(gasJson.nextReservation.id),
          datetime: safeStr(gasJson.nextReservation.datetime),
          title: safeStr(gasJson.nextReservation.title),
          status: safeStr(gasJson.nextReservation.status),
        }
      : null;

    const orders: OrderForMyPage[] = Array.isArray(gasJson.orders)
      ? gasJson.orders.map((o) => {
          let paidAtIso = "";
          if (o.paid_at_jst) {
            const replaced = o.paid_at_jst.replace(/\//g, "-");
            paidAtIso = replaced.replace(" ", "T") + "+09:00";
          }
          return {
            id: safeStr(o.id),
            productCode: safeStr(o.product_code),
            productName: safeStr(o.product_name),
            amount: Number(o.amount) || 0,
            paidAt: paidAtIso,
            shippingStatus: (o.shipping_status || "pending") as ShippingStatus,
            shippingEta: o.shipping_eta || undefined,
            trackingNumber: o.tracking_number || undefined,
            paymentStatus: (o.payment_status || "paid") as PaymentStatus,
          };
        })
      : [];

    const ordersFlags: OrdersFlags = {
      canPurchaseCurrentCourse: gasJson.flags?.canPurchaseCurrentCourse ?? false,
      canApplyReorder: gasJson.flags?.canApplyReorder ?? false,
      hasAnyPaidOrder: gasJson.flags?.hasAnyPaidOrder ?? orders.length > 0,
    };

    const rawReorders = Array.isArray(gasJson.reorders) ? gasJson.reorders : [];
    const reorders = rawReorders.map((r: any) => ({
      id: safeStr(r.id),
      status: safeStr(r.status),
      createdAt: safeStr(r.createdAt),
      productCode: safeStr(r.productCode ?? r.product_code),
      mg: safeStr(r.mg),
      months: Number(r.months) || undefined,
    }));

    const rawHistory = Array.isArray(gasJson.history) ? gasJson.history : [];
    const history: HistoryForMyPage[] = rawHistory.map((h: any, idx: number) => ({
      id: safeStr(h.id || h.history_id || `${idx}`),
      date: safeStr(h.date || h.createdAt || h.paid_at_jst || ""),
      title: safeStr(h.title || h.product_name || h.menu || ""),
      detail: safeStr(h.detail || h.note || h.description || ""),
    }));

    return NextResponse.json(
      {
        ok: true,
        patient,
        nextReservation,
        activeOrders: orders,
        ordersFlags,
        reorders,
        history,
      },
      { status: 200, headers: noCacheHeaders }
    );
  } catch {
    console.error("POST /api/mypage error");
    return fail("unexpected_error", 500);
  }
}
