// app/api/mypage/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { verifyPatientSession } from "@/lib/patient-session";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { getProductNamesMap } from "@/lib/products";

type ShippingStatus = "pending" | "preparing" | "shipped" | "delivered";
type PaymentStatus = "paid" | "pending" | "failed" | "refunded" | "cancelled";
type RefundStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "UNKNOWN";

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
  paymentMethod?: "credit_card" | "bank_transfer"; // ★ 決済方法
  refundStatus?: RefundStatus;
  refundedAt?: string; // ISO（返金日時）
  refundedAmount?: number;
  cancelledAt?: string; // ISO（キャンセル日時：支払い前キャンセル・二重入力等）
};

type OrdersFlags = {
  canPurchaseCurrentCourse: boolean;
  canApplyReorder: boolean;
  hasAnyPaidOrder: boolean;
};

function toIsoFlexible(v: unknown): string {
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

function normalizePaymentStatus(v: unknown): PaymentStatus {
  const s = (typeof v === "string" ? v : String(v ?? "")).toLowerCase();
  if (s === "paid" || s === "pending" || s === "failed" || s === "refunded" || s === "cancelled") return s as PaymentStatus;
  if (String(v ?? "").toUpperCase() === "COMPLETED") return "paid";
  return "paid";
}

function normalizeRefundStatus(v: unknown): RefundStatus | undefined {
  const s = (typeof v === "string" ? v : String(v ?? "")).toUpperCase().trim();
  if (!s) return undefined;
  if (s === "PENDING" || s === "COMPLETED" || s === "FAILED" || s === "CANCELLED") return s as RefundStatus;
  return "UNKNOWN";
}

function toNumberOrUndefined(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// Supabase ordersテーブルから直接取得（高速化）
export async function GET(req: NextRequest) {
  try {
    const tenantId = resolveTenantIdOrThrow(req);

    // 患者セッション検証（JWT + 旧Cookieフォールバック）
    const session = await verifyPatientSession(req);
    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthorized: patient_id cookie not found" }, { status: 401 });
    }
    const patientId = session.patientId;

    // ★ Supabaseから直接取得（GAS不要、50-100ms）
    // ordersテーブルにはクレカ決済と銀行振込（payment_method='bank_transfer'）の両方が入っている
    const { data: rawOrders, error } = await strictWithTenant(supabaseAdmin
      .from("orders")
      .select("*")
      .eq("patient_id", patientId), tenantId)
      .order("paid_at", { ascending: false });

    if (error) {
      console.error("[mypage/orders] Supabase query error:", error);
      return NextResponse.json({ ok: false, error: "database_error" }, { status: 500 });
    }

    // product_nameがnullの注文用に商品名マップを取得
    const productNames = await getProductNamesMap(tenantId ?? undefined);

    // ordersテーブルから注文データを取得（bank_transfer_ordersは廃止済み）
    interface RawOrder {
      id: string;
      product_code: string;
      productCode?: string;
      product_name: string | null;
      productName?: string;
      amount: number;
      paid_at_jst?: string;
      paidAt?: string;
      paid_at?: string;
      order_datetime?: string;
      orderDateTime?: string;
      created_at?: string;
      shipping_status?: string;
      shippingStatus?: string;
      shipping_date?: string;
      shipping_eta?: string;
      shippingEta?: string;
      tracking_number?: string;
      trackingNumber?: string;
      payment_status?: string;
      paymentStatus?: string;
      payment_method?: string;
      status?: string;
      refund_status?: string;
      refundStatus?: string;
      refunded_at_jst?: string;
      refundedAt?: string;
      refunded_at?: string;
      refunded_amount?: number;
      refundedAmount?: number;
      cancelled_at?: string;
      cancelledAt?: string;
    }
    const orders: OrderForMyPage[] = rawOrders.map((o: RawOrder) => {
      const paidRaw =
        o.paid_at_jst ??
        o.paidAt ??
        o.paid_at ??
        o.order_datetime ??
        o.orderDateTime ??
        o.created_at ??
        "";

      const refundedRaw =
        o.refunded_at_jst ??
        o.refundedAt ??
        o.refunded_at ??
        "";

      // status='pending_confirmation'の場合はpaymentStatusを'pending'にする
      let paymentStatus = normalizePaymentStatus(o.payment_status ?? o.paymentStatus);
      if (o.status === "pending_confirmation") {
        paymentStatus = "pending" as PaymentStatus;
      }
      // キャンセル/返金のpaymentStatus反映
      if (o.status === "cancelled") {
        const rs = normalizeRefundStatus(o.refund_status ?? o.refundStatus);
        if (rs === "PENDING" || rs === "COMPLETED") {
          paymentStatus = "refunded" as PaymentStatus;
        } else {
          paymentStatus = "cancelled" as PaymentStatus;
        }
      }

      return {
        id: String(o.id ?? ""),
        productCode: String(o.product_code ?? o.productCode ?? ""),
        productName: productNames[o.product_code] || String(o.product_name ?? o.productName ?? "") || o.product_code || "",
        amount: Number(o.amount) || 0,
        paidAt: toIsoFlexible(paidRaw),
        shippingStatus: ((o.shipping_status || o.shippingStatus || "pending") as ShippingStatus) || "pending",
        shippingEta: (o.shipping_date ?? o.shipping_eta ?? o.shippingEta) || undefined,
        trackingNumber: (o.tracking_number ?? o.trackingNumber) || undefined,
        paymentStatus,
        paymentMethod: (o.payment_method === "bank_transfer" ? "bank_transfer" : "credit_card") as "credit_card" | "bank_transfer",
        refundStatus: normalizeRefundStatus(o.refund_status ?? o.refundStatus) || (o.status === "cancelled" ? "CANCELLED" as RefundStatus : undefined),
        refundedAt: toIsoFlexible(refundedRaw) || undefined,
        refundedAmount: toNumberOrUndefined(o.refunded_amount ?? o.refundedAmount),
        cancelledAt: toIsoFlexible(o.cancelled_at ?? o.cancelledAt ?? "") || undefined,
      };
    });

    // ★ Flags computed from Supabase orders data
    const flags: OrdersFlags = {
      canPurchaseCurrentCourse: true, // 初回購入は常に許可（複雑なロジックは後で追加可能）
      canApplyReorder: orders.length > 0, // 注文履歴があれば再購入可能
      hasAnyPaidOrder: orders.length > 0,
    };

    return NextResponse.json({ ok: true, orders, flags }, { status: 200 });
  } catch (err) {
    console.error("GET /api/mypage/orders error:", err);
    return serverError("unexpected error");
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
