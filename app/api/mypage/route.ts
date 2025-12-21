// app/api/mypage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
export const dynamic = "force-dynamic";

type ShippingStatus = "pending" | "preparing" | "shipped" | "delivered";
type PaymentStatus = "paid" | "pending" | "failed" | "refunded";
type RefundStatus = "PENDING" | "COMPLETED" | "FAILED" | "UNKNOWN";

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

  // refund fields
  refundStatus?: RefundStatus;
  refundedAt?: string; // ISO
  refundedAmount?: number;
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
    paid_at_jst: string; // "2025/12/08 10:23:00"
    shipping_status?: string;
    shipping_eta?: string;
    tracking_number?: string;
    payment_status?: string;

    // refund fields (GAS側で返す想定)
    refund_status?: string; // "PENDING" | "COMPLETED" | ...
    refunded_at_jst?: string; // "2025/12/08 10:23:00"
    refunded_amount?: number | string; // 13000
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

function toIsoFromJstDateTime(jst: string): string {
  const s = safeStr(jst).trim();
  if (!s) return "";
  const replaced = s.replace(/\//g, "-"); // "2025-12-08 10:23:00"
  return replaced.replace(" ", "T") + "+09:00";
}

function normalizePaymentStatus(v: any): PaymentStatus {
  const s = safeStr(v).toLowerCase();
  if (s === "paid" || s === "pending" || s === "failed" || s === "refunded") return s as PaymentStatus;
  // 既存GASが "COMPLETED" 等を返してしまう可能性もあるので保険
  if (safeStr(v).toUpperCase() === "COMPLETED") return "paid";
  return "paid";
}

function normalizeRefundStatus(v: any): RefundStatus | undefined {
  const s = safeStr(v).toUpperCase();
  if (!s) return undefined;
  if (s === "PENDING" || s === "COMPLETED" || s === "FAILED") return s as RefundStatus;
  return "UNKNOWN";
}

function toNumberOrUndefined(v: any): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function POST(_req: NextRequest) {
  try {
    if (!GAS_MYPAGE_URL) return fail("server_config_error", 500);

    // ★ あなたの環境では cookies() が Promise なので await
    const cookieStore = await cookies();

    const getCookieValue = (name: string): string => {
      const c = cookieStore.get(name);
      return c?.value ?? "";
    };

    const patientId = getCookieValue("__Host-patient_id") || getCookieValue("patient_id");
    if (!patientId) return fail("unauthorized", 401);

    const lineUserId = getCookieValue("__Host-line_user_id") || getCookieValue("line_user_id");

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

    const url = `${GAS_MYPAGE_URL}?type=getDashboard&patient_id=${encodeURIComponent(patientId)}`;

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

    const patient = gasJson.patient?.id
      ? {
          id: safeStr(gasJson.patient.id),
          displayName: safeStr(gasJson.patient.displayName || ""),
        }
      : undefined;

    const nextReservation = gasJson.nextReservation
      ? {
          id: safeStr(gasJson.nextReservation.id),
          datetime: safeStr(gasJson.nextReservation.datetime),
          title: safeStr(gasJson.nextReservation.title),
          status: safeStr(gasJson.nextReservation.status),
        }
      : null;

    const ordersAll: OrderForMyPage[] = Array.isArray(gasJson.orders)
      ? gasJson.orders.map((o) => {
          const paidAt = o.paid_at_jst ? toIsoFromJstDateTime(o.paid_at_jst) : "";
          const refundStatus = normalizeRefundStatus((o as any).refund_status);
          const refundedAt = (o as any).refunded_at_jst ? toIsoFromJstDateTime((o as any).refunded_at_jst) : "";

          return {
            id: safeStr(o.id),
            productCode: safeStr(o.product_code),
            productName: safeStr(o.product_name),
            amount: Number(o.amount) || 0,
            paidAt,
            shippingStatus: (safeStr(o.shipping_status) || "pending") as ShippingStatus,
            shippingEta: safeStr(o.shipping_eta) || undefined,
            trackingNumber: safeStr(o.tracking_number) || undefined,
            paymentStatus: normalizePaymentStatus(o.payment_status),

            refundStatus,
            refundedAt: refundedAt || undefined,
            refundedAmount: toNumberOrUndefined((o as any).refunded_amount),
          };
        })
      : [];

    // 方針：注文／申請・発送状況 は「返金済み（COMPLETED）」を表示しない
    const activeOrders = ordersAll.filter((o) => o.refundStatus !== "COMPLETED");

    const ordersFlags: OrdersFlags = {
      canPurchaseCurrentCourse: gasJson.flags?.canPurchaseCurrentCourse ?? false,
      canApplyReorder: gasJson.flags?.canApplyReorder ?? false,
      hasAnyPaidOrder: gasJson.flags?.hasAnyPaidOrder ?? ordersAll.length > 0,
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
        activeOrders,
        ordersFlags,
        reorders,
        history,
      },
      { status: 200, headers: noCacheHeaders }
    );
  } catch (err) {
    console.error("POST /api/mypage error", err);
    return fail("unexpected_error", 500);
  }
}
