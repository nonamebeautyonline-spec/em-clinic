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
  refundStatus?: RefundStatus;
  refundedAt?: string; // ISO
  refundedAmount?: number;
};

type OrdersFlags = {
  canPurchaseCurrentCourse: boolean;
  canApplyReorder: boolean;
  hasAnyPaidOrder: boolean;
};

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;

function toIsoFlexible(v: any): string {
  const s = (typeof v === "string" ? v : String(v ?? "")).trim();
  if (!s) return "";

  // ISOっぽい（Tを含む）ならそのまま
  if (s.includes("T")) return s;

  // yyyy/MM/dd HH:mm(:ss)
  if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    const replaced = s.replace(/\//g, "-");
    const withSec = /:\d{2}:\d{2}$/.test(replaced) ? replaced : replaced + ":00";
    return withSec.replace(" ", "T") + "+09:00";
  }

  // yyyy-MM-dd HH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) {
    return s.replace(" ", "T") + "+09:00";
  }

  // yyyy-MM-dd or yyyy/MM/dd
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
    const parts = s.replace(/\//g, "-").split("-");
    const y = parts[0];
    const mm = parts[1].padStart(2, "0");
    const dd = parts[2].padStart(2, "0");
    return `${y}-${mm}-${dd}T00:00:00+09:00`;
  }

  // 最後の保険
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();

  return "";
}

function normalizePaymentStatus(v: any): PaymentStatus {
  const s = (typeof v === "string" ? v : String(v ?? "")).toLowerCase();
  if (s === "paid" || s === "pending" || s === "failed" || s === "refunded") return s as PaymentStatus;
  if (String(v ?? "").toUpperCase() === "COMPLETED") return "paid";
  return "paid";
}

function normalizeRefundStatus(v: any): RefundStatus | undefined {
  const s = (typeof v === "string" ? v : String(v ?? "")).toUpperCase().trim();
  if (!s) return undefined;
  if (s === "PENDING" || s === "COMPLETED" || s === "FAILED") return s as RefundStatus;
  return "UNKNOWN";
}

function toNumberOrUndefined(v: any): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// getDashboard(full=1) から orders を取り、同じ形式で返す
export async function GET(_req: NextRequest) {
  try {
    if (!GAS_MYPAGE_URL) {
      return NextResponse.json({ ok: false, error: "GAS_MYPAGE_URL is not configured." }, { status: 500 });
    }

    const cookieStore = await cookies();
    const patientId =
      cookieStore.get("__Host-patient_id")?.value ||
      cookieStore.get("patient_id")?.value ||
      "";

    if (!patientId) {
      return NextResponse.json({ ok: false, error: "unauthorized: patient_id cookie not found" }, { status: 401 });
    }

    const url = `${GAS_MYPAGE_URL}?type=getDashboard&patient_id=${encodeURIComponent(patientId)}&full=1`;

    const gasRes = await fetch(url, { method: "GET", cache: "no-store" });
    const text = await gasRes.text().catch(() => "");
    if (!gasRes.ok) {
      return NextResponse.json({ ok: false, error: "failed to fetch dashboard from GAS", detail: text }, { status: 500 });
    }

    let gasJson: any = {};
    try {
      gasJson = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({ ok: false, error: "gas_invalid_json" }, { status: 500 });
    }

    const rawOrders = Array.isArray(gasJson.orders) ? gasJson.orders : [];

    const orders: OrderForMyPage[] = rawOrders.map((o: any) => {
      const paidRaw =
        o.paid_at_jst ??
        o.paidAt ??
        o.paid_at ??
        o.order_datetime ??
        o.orderDateTime ??
        "";

      const refundedRaw =
        o.refunded_at_jst ??
        o.refundedAt ??
        o.refunded_at ??
        "";

      return {
        id: String(o.id ?? ""),
        productCode: String(o.product_code ?? o.productCode ?? ""),
        productName: String(o.product_name ?? o.productName ?? ""),
        amount: Number(o.amount) || 0,
        paidAt: toIsoFlexible(paidRaw),
        shippingStatus: ((o.shipping_status || o.shippingStatus || "pending") as ShippingStatus) || "pending",
        shippingEta: (o.shipping_eta ?? o.shippingEta) || undefined,
        trackingNumber: (o.tracking_number ?? o.trackingNumber) || undefined,
        paymentStatus: normalizePaymentStatus(o.payment_status ?? o.paymentStatus),
        refundStatus: normalizeRefundStatus(o.refund_status ?? o.refundStatus),
        refundedAt: toIsoFlexible(refundedRaw) || undefined,
        refundedAmount: toNumberOrUndefined(o.refunded_amount ?? o.refundedAmount),
      };
    });

    const flags: OrdersFlags = {
      canPurchaseCurrentCourse: !!(gasJson.flags?.canPurchaseCurrentCourse),
      canApplyReorder: !!(gasJson.flags?.canApplyReorder),
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
