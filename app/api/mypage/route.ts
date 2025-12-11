// app/api/mypage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const GAS_MYPAGE_ORDERS_URL = process.env.GAS_MYPAGE_ORDERS_URL;
const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

// ---- GAS 側レスポンス型（ざっくり） ----
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
  activeOrders?: any[];
  history?: any[];
};

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

type GasReorderResponse = {
  ok: boolean;
  reorders?: any[];
  error?: string;
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

    // ---------- ① GAS ダッシュボード ----------
    const dashboardPromise = (async () => {
      const url =
        GAS_MYPAGE_URL +
        `?type=getDashboard&patient_id=${encodeURIComponent(patientId)}`;

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("GAS getDashboard error:", res.status, text);
        throw new Error("failed to fetch dashboard from GAS");
      }

      const json = (await res.json()) as GasDashboardResponse;
      return json;
    })();

    // ---------- ② GAS 注文＋フラグ ----------
    const ordersPromise = GAS_MYPAGE_ORDERS_URL
      ? (async () => {
          const res = await fetch(GAS_MYPAGE_ORDERS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patient_id: patientId }),
            cache: "no-store",
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error("GAS orders error:", res.status, text);
            // 注文だけ落ちても、マイページ自体は返したいので throw しない
            return null;
          }

          const json = (await res.json()) as GasOrdersResponse;
          if (!json.ok) {
            console.error("GAS orders returned error:", json.error);
            return null;
          }
          return json;
        })()
      : Promise.resolve<GasOrdersResponse | null>(null);

    // ---------- ③ GAS 再処方リスト ----------
    const reordersPromise = GAS_REORDER_URL
      ? (async () => {
          const res = await fetch(GAS_REORDER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "list", patient_id: patientId }),
            cache: "no-store",
          });

          const json = (await res.json().catch(() => ({}))) as GasReorderResponse;

          if (!res.ok || !json.ok) {
            console.error("GAS reorders error:", json.error);
            return null;
          }

          return json;
        })()
      : Promise.resolve<GasReorderResponse | null>(null);

    // ---------- まとめて待つ ----------
    const [dashboardJson, ordersJson, reordersJson] = await Promise.all([
      dashboardPromise,
      ordersPromise,
      reordersPromise,
    ]);

    // 注文を /api/mypage/orders と同じ形に整形
    let orders: OrderForMyPage[] = [];
    let ordersFlags: OrdersFlags | undefined = undefined;

    if (ordersJson && ordersJson.orders) {
      orders =
        ordersJson.orders?.map((o) => {
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
          ordersJson.flags?.canPurchaseCurrentCourse ?? false,
        canApplyReorder: ordersJson.flags?.canApplyReorder ?? false,
        hasAnyPaidOrder:
          ordersJson.flags?.hasAnyPaidOrder ?? (orders.length > 0),
      };
    }

    const reorders = reordersJson?.reorders ?? [];

    return NextResponse.json(
      {
        ok: true,
        patient: dashboardJson.patient,
        nextReservation: dashboardJson.nextReservation ?? null,
        // PatientDashboardInner の型互換のため activeOrders のまま返す
        activeOrders: orders,
        history: dashboardJson.history ?? [],
        ordersFlags,
        reorders,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/mypage error:", err);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 }
    );
  }
}
