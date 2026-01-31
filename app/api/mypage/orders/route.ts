// app/api/mypage/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  paymentMethod?: "credit_card" | "bank_transfer"; // ★ 決済方法
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

// Supabase ordersテーブルから直接取得（高速化）
export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const patientId =
      cookieStore.get("__Host-patient_id")?.value ||
      cookieStore.get("patient_id")?.value ||
      "";

    if (!patientId) {
      return NextResponse.json({ ok: false, error: "unauthorized: patient_id cookie not found" }, { status: 401 });
    }

    // ★ Supabaseから直接取得（GAS不要、50-100ms）
    // ordersテーブルにはクレカ決済と銀行振込（payment_method='bank_transfer'）の両方が入っている
    const { data: rawOrders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("patient_id", patientId)
      .order("paid_at", { ascending: false });

    if (error) {
      console.error("[mypage/orders] Supabase query error:", error);
      return NextResponse.json({ ok: false, error: "database_error" }, { status: 500 });
    }

    const creditCardOrders: OrderForMyPage[] = rawOrders.map((o: any) => {
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
        shippingEta: (o.shipping_date ?? o.shipping_eta ?? o.shippingEta) || undefined,
        trackingNumber: (o.tracking_number ?? o.trackingNumber) || undefined,
        paymentStatus: normalizePaymentStatus(o.payment_status ?? o.paymentStatus),
        paymentMethod: (o.payment_method === "bank_transfer" ? "bank_transfer" : "credit_card") as "credit_card" | "bank_transfer",
        refundStatus: normalizeRefundStatus(o.refund_status ?? o.refundStatus),
        refundedAt: toIsoFlexible(refundedRaw) || undefined,
        refundedAmount: toNumberOrUndefined(o.refunded_amount ?? o.refundedAmount),
      };
    });

    // ★ 銀行振込の確認中データを取得（ordersテーブルにまだ入っていないもの）
    const { data: bankTransferData, error: bankTransferError } = await supabase
      .from("bank_transfer_orders")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (bankTransferError) {
      console.error("[mypage/orders] Bank transfer query error:", bankTransferError);
    }

    // ★ 商品マスターデータ
    const PRODUCTS: Record<string, { name: string; price: number }> = {
      "MJL_2.5mg_1m": { name: "マンジャロ 2.5mg 1ヶ月", price: 13000 },
      "MJL_2.5mg_2m": { name: "マンジャロ 2.5mg 2ヶ月", price: 25500 },
      "MJL_2.5mg_3m": { name: "マンジャロ 2.5mg 3ヶ月", price: 35000 },
      "MJL_5mg_1m": { name: "マンジャロ 5mg 1ヶ月", price: 22850 },
      "MJL_5mg_2m": { name: "マンジャロ 5mg 2ヶ月", price: 45500 },
      "MJL_5mg_3m": { name: "マンジャロ 5mg 3ヶ月", price: 63000 },
      "MJL_7.5mg_1m": { name: "マンジャロ 7.5mg 1ヶ月", price: 34000 },
      "MJL_7.5mg_2m": { name: "マンジャロ 7.5mg 2ヶ月", price: 65000 },
      "MJL_7.5mg_3m": { name: "マンジャロ 7.5mg 3ヶ月", price: 96000 },
    };

    // 既にordersテーブルに存在するbt_*のIDを取得（重複を避けるため）
    const existingBtIds = new Set(
      creditCardOrders
        .filter(o => o.id.startsWith("bt_"))
        .map(o => o.id.replace("bt_", ""))
    );

    const bankTransferOrders: OrderForMyPage[] = (bankTransferData || [])
      .filter((o: any) => !existingBtIds.has(String(o.id))) // 既にordersテーブルにあるものは除外
      .map((o: any) => {
        const productCode = String(o.product_code ?? "");
        const productInfo = PRODUCTS[productCode] || { name: "マンジャロ", price: 0 };

        const paidAt = toIsoFlexible(o.confirmed_at ?? o.created_at ?? "");

        return {
          id: `bank_${o.id}`, // 一時的なID（ordersテーブルに保存されたらbt_に変わる）
          productCode,
          productName: productInfo.name,
          amount: productInfo.price,
          paidAt,
          shippingStatus: "pending",
          shippingEta: undefined,
          trackingNumber: undefined,
          paymentStatus: "pending", // ★ 確認中
          paymentMethod: "bank_transfer",
          refundStatus: undefined,
          refundedAt: undefined,
          refundedAmount: undefined,
        };
      });

    // ★ 統合して日付順にソート
    const orders = [...creditCardOrders, ...bankTransferOrders];
    orders.sort((a, b) => {
      const dateA = new Date(a.paidAt).getTime();
      const dateB = new Date(b.paidAt).getTime();
      return dateB - dateA; // 新しい順
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
    return NextResponse.json({ ok: false, error: "unexpected error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
