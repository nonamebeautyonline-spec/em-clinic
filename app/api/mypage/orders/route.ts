// app/api/mypage/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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
  }[];
  flags?: Partial<OrdersFlags>;
  error?: string;
};

const GAS_MYPAGE_ORDERS_URL = process.env.GAS_MYPAGE_ORDERS_URL;

export async function GET(req: NextRequest) {
  try {
    if (!GAS_MYPAGE_ORDERS_URL) {
      return NextResponse.json(
        {
          ok: false,
          error: "GAS_MYPAGE_ORDERS_URL is not configured.",
        },
        { status: 500 }
      );
    }

    // cookie から patient_id を取得（/api/mypage/profile と揃える）
    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_id")?.value;

    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized: patient_id cookie not found" },
        { status: 401 }
      );
    }

    // GAS に patient_id を投げる
    const gasRes = await fetch(GAS_MYPAGE_ORDERS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId }),
      cache: "no-store",
    });

    if (!gasRes.ok) {
      const text = await gasRes.text().catch(() => "");
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
      gasJson.orders?.map((o) => {
        // "2025/12/08 10:23:00" -> ISO に変換（簡易）
        let paidAtIso = "";
        if (o.paid_at_jst) {
          // 「YYYY/MM/DD HH:mm:ss +09:00」という形にしてから ISO 化
          const replaced = o.paid_at_jst.replace(/\//g, "-"); // "2025-12-08 10:23:00"
          paidAtIso = replaced.replace(" ", "T") + "+09:00";
        }

        const shippingStatus = (o.shipping_status || "pending") as ShippingStatus;
        const paymentStatus = (o.payment_status || "paid") as PaymentStatus;

        return {
          id: o.id,
          productCode: o.product_code,
          productName: o.product_name,
          amount: o.amount,
          paidAt: paidAtIso,
          shippingStatus,
          shippingEta: o.shipping_eta || undefined,
          trackingNumber: o.tracking_number || undefined,
          paymentStatus,
        };
      }) ?? [];

    const flags: OrdersFlags = {
      canPurchaseCurrentCourse: gasJson.flags?.canPurchaseCurrentCourse ?? false,
      canApplyReorder: gasJson.flags?.canApplyReorder ?? false,
      hasAnyPaidOrder: gasJson.flags?.hasAnyPaidOrder ?? orders.length > 0,
    };

    return NextResponse.json(
      {
        ok: true,
        orders,
        flags,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/mypage/orders error:", err);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
