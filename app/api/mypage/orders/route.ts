// app/api/mypage/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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

type GasOrdersResponse = {
  ok: boolean;
  orders?: {
    id: string;
    product_code: string;
    product_name: string;
    amount: number;
    paid_at_jst: string; // "2025/12/08 10:23:00"
    shipping_status?: string;
    shipping_eta?: string; // "2025-12-10"
    tracking_number?: string;
    payment_status?: string;

    // refund fields (GAS側で返す想定)
    refund_status?: string;
    refunded_at_jst?: string;
    refunded_amount?: number | string;
  }[];
  flags?: Partial<OrdersFlags>;
  error?: string;
};

const GAS_MYPAGE_ORDERS_URL = process.env.GAS_MYPAGE_ORDERS_URL;

function toIsoFlexible(v: any): string {
  const s = (typeof v === "string" ? v : String(v ?? "")).trim();
  if (!s) return "";

  // すでにISOっぽい（2026-01-13T... or ...+09:00 等）はそのまま返す
  if (s.includes("T")) return s;

  // "yyyy/MM/dd HH:mm:ss" or "yyyy/MM/dd HH:mm"
  if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    const replaced = s.replace(/\//g, "-");
    const withSec = replaced.match(/:\d{2}$/) ? replaced : replaced + ":00";
    return withSec.replace(" ", "T") + "+09:00";
  }

  // "yyyy-MM-dd HH:mm:ss"
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) {
    return s.replace(" ", "T") + "+09:00";
  }

  // "yyyy-MM-dd" or "yyyy/MM/dd"
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
    const parts = s.replace(/\//g, "-").split("-");
    const y = parts[0];
    const mm = parts[1].padStart(2, "0");
    const dd = parts[2].padStart(2, "0");
    return `${y}-${mm}-${dd}T00:00:00+09:00`;
  }

  // 最後の保険：Dateで解釈できるならISO化
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();

  return "";
}


function normalizePaymentStatus(v: any): PaymentStatus {
  const s = (typeof v === "string" ? v : String(v ?? "")).toLowerCase();
  if (s === "paid" || s === "pending" || s === "failed" || s === "refunded") return s as PaymentStatus;
  if ((typeof v === "string" ? v : String(v ?? "")).toUpperCase() === "COMPLETED") return "paid";
  return "paid";
}

function normalizeRefundStatus(v: any): RefundStatus | undefined {
  const s = (typeof v === "string" ? v : String(v ?? "")).toUpperCase();
  if (!s) return undefined;
  if (s === "PENDING" || s === "COMPLETED" || s === "FAILED") return s as RefundStatus;
  return "UNKNOWN";
}

function toNumberOrUndefined(v: any): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// このエンドポイントは「一覧用途」想定：返金済みも含めて返す（フィルタはフロントで）
export async function GET(_req: NextRequest) {
  try {
    if (!GAS_MYPAGE_ORDERS_URL) {
      return NextResponse.json(
        { ok: false, error: "GAS_MYPAGE_ORDERS_URL is not configured." },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const patientId =
      cookieStore.get("__Host-patient_id")?.value ||
      cookieStore.get("patient_id")?.value ||
      "";

    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized: patient_id cookie not found" },
        { status: 401 }
      );
    }

    const gasRes = await fetch(GAS_MYPAGE_ORDERS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId }),
      cache: "no-store",
    });

    if (!gasRes.ok) {
      console.error("GAS orders error:", gasRes.status);
      return NextResponse.json(
        { ok: false, error: "failed to fetch orders from GAS" },
        { status: 500 }
      );
    }

    const gasJson = (await gasRes.json()) as GasOrdersResponse;

    if (!gasJson.ok) {
      return NextResponse.json(
        { ok: false, error: gasJson.error || "GAS returned error" },
        { status: 500 }
      );
    }

const orders: OrderForMyPage[] =
  gasJson.orders?.map((o: any) => {
    // paidAt: paid_at_jst が無い場合の保険
    const paidRaw =
      o.paid_at_jst ??
      o.paidAt ??
      o.paid_at ??
      o.order_datetime ??
      o.orderDateTime ??
      "";

    const paidAtIso = toIsoFlexible(paidRaw);

    // refundedAt: refunded_at_jst が無い場合の保険
    const refundedRaw =
      o.refunded_at_jst ??
      o.refundedAt ??
      o.refunded_at ??
      "";

    const refundedAtIso = toIsoFlexible(refundedRaw);

    // refund status の保険
    const refundStatusRaw =
      o.refund_status ??
      o.refundStatus ??
      "";

    // refunded amount の保険
    const refundedAmountRaw =
      o.refunded_amount ??
      o.refundedAmount ??
      "";

    return {
      id: String(o.id ?? ""),
      productCode: String(o.product_code ?? o.productCode ?? ""),
      productName: String(o.product_name ?? o.productName ?? ""),
      amount: Number(o.amount) || 0,

      paidAt: paidAtIso,

      shippingStatus: ((o.shipping_status || o.shippingStatus || "pending") as ShippingStatus) || "pending",
      shippingEta: o.shipping_eta ?? o.shippingEta ?? undefined,
      trackingNumber: o.tracking_number ?? o.trackingNumber ?? undefined,

      paymentStatus: normalizePaymentStatus(o.payment_status ?? o.paymentStatus),

      refundStatus: normalizeRefundStatus(refundStatusRaw),
      refundedAt: refundedAtIso || undefined,
      refundedAmount: toNumberOrUndefined(refundedAmountRaw),
    };
  }) ?? [];


    const flags: OrdersFlags = {
      canPurchaseCurrentCourse: gasJson.flags?.canPurchaseCurrentCourse ?? false,
      canApplyReorder: gasJson.flags?.canApplyReorder ?? false,
      hasAnyPaidOrder: gasJson.flags?.hasAnyPaidOrder ?? orders.length > 0,
    };

    return NextResponse.json({ ok: true, orders, flags }, { status: 200 });
  } catch (err) {
    console.error("GET /api/mypage/orders error:", err);
    return NextResponse.json({ ok: false, error: "unexpected error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
