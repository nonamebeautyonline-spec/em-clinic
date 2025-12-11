// app/api/mypage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;

// ★ これを追加（Route Handler のキャッシュを完全に無効化）
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

// GAS 側 getDashboard のレスポンス想定
type GasDashboardResponse = {
  patient?: {
    id: string;
    displayName: string;
  };
  nextReservation?: {
    id: string;
    datetime: string;
    title: string;
    status: string;
  } | null;
  activeOrders?: any[]; // 互換用（今は使わない）
  history?: any[];
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
};

export async function POST(req: NextRequest) {
  try {
    if (!GAS_MYPAGE_URL) {
      return NextResponse.json(
        { ok: false, error: "GAS_MYPAGE_URL is not configured." },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_id")?.value;

    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized: patient_id cookie not found" },
        { status: 401 }
      );
    }

    // GAS の getDashboard を patient_id ベースで1本だけ叩く
    const url =
      GAS_MYPAGE_URL +
      `?type=getDashboard&patient_id=${encodeURIComponent(patientId)}`;

    const gasRes = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!gasRes.ok) {
      const text = await gasRes.text().catch(() => "");
      console.error("GAS getDashboard error:", gasRes.status, text);
      return NextResponse.json(
        { ok: false, error: "failed to fetch dashboard from GAS" },
        { status: 500 }
      );
    }

    const gasJson = (await gasRes.json()) as GasDashboardResponse;

    // ----- orders / flags をフロント用形式にマッピング -----
    let orders: OrderForMyPage[] = [];
    let ordersFlags: OrdersFlags | undefined = undefined;

    if (gasJson.orders && Array.isArray(gasJson.orders)) {
      orders =
        gasJson.orders.map((o) => {
          let paidAtIso = "";
          if (o.paid_at_jst) {
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

      ordersFlags = {
        canPurchaseCurrentCourse:
          gasJson.flags?.canPurchaseCurrentCourse ?? false,
        canApplyReorder: gasJson.flags?.canApplyReorder ?? false,
        hasAnyPaidOrder:
          gasJson.flags?.hasAnyPaidOrder ?? (orders.length > 0),
      };
    }

    return new NextResponse(
      JSON.stringify({
        ok: true,
        patient: gasJson.patient,
        nextReservation: gasJson.nextReservation ?? null,
        activeOrders: orders,
        history: gasJson.history ?? [],
        ordersFlags,
        reorders: gasJson.reorders ?? [],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // ★ ブラウザ／CDN／Next のキャッシュを全部禁止
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );

  } catch (err) {
    console.error("POST /api/mypage error:", err);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
