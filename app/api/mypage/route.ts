// app/api/mypage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const GAS_INTAKE_LIST_URL = process.env.GAS_INTAKE_LIST_URL;
export const dynamic = "force-dynamic";

type ShippingStatus = "pending" | "preparing" | "shipped" | "delivered";
type PaymentStatus = "paid" | "pending" | "failed" | "refunded";
type RefundStatus = "PENDING" | "COMPLETED" | "FAILED" | "UNKNOWN";
type Carrier = "japanpost" | "yamato";

type OrderForMyPage = {
  id: string;
  productCode: string;
  productName: string;
  amount: number;
  paidAt: string;
  shippingStatus: ShippingStatus;
  shippingEta?: string;
  trackingNumber?: string;
  paymentStatus: PaymentStatus;
  carrier?: Carrier;
  refundStatus?: RefundStatus;
  refundedAt?: string;
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
  patient?: {
    id: string;
    displayName?: string;
    line_user_id?: string; // GAS getDashboard から返す
    [k: string]: any;
  };
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
    carrier?: string;
    refund_status?: string;
    refunded_at_jst?: string;
    refunded_amount?: number | string;
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
  const replaced = s.replace(/\//g, "-");
  return replaced.replace(" ", "T") + "+09:00";
}

function toIsoFromJstDateOrDateTime(jst: string): string {
  const s = safeStr(jst).trim();
  if (!s) return "";
  if (/\d{2}:\d{2}/.test(s)) return toIsoFromJstDateTime(s);

  const m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m) {
    const y = m[1];
    const mm = String(m[2]).padStart(2, "0");
    const dd = String(m[3]).padStart(2, "0");
    return `${y}-${mm}-${dd}T00:00:00+09:00`;
  }
  return "";
}

function normalizePaymentStatus(v: any): PaymentStatus {
  const s = safeStr(v).toLowerCase();
  if (s === "paid" || s === "pending" || s === "failed" || s === "refunded") return s as PaymentStatus;
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

const TRACKING_SWITCH_AT = new Date("2025-12-22T00:00:00+09:00").getTime();

function normalizeCarrier(v: any): Carrier | undefined {
  const s = safeStr(v).toLowerCase();
  if (s === "japanpost" || s === "yamato") return s as Carrier;
  return undefined;
}

function inferCarrierFromDates(o: { shippingEta?: string; paidAt?: string }): Carrier {
  const se = safeStr(o.shippingEta).trim();
  if (se) {
    const t = new Date(se).getTime();
    if (Number.isFinite(t)) return t < TRACKING_SWITCH_AT ? "japanpost" : "yamato";
  }
  const pa = safeStr(o.paidAt).trim();
  if (pa) {
    const t = new Date(pa).getTime();
    if (Number.isFinite(t)) return t < TRACKING_SWITCH_AT ? "japanpost" : "yamato";
  }
  return "yamato";
}

async function fetchJsonText(url: string): Promise<{ ok: boolean; text: string; status: number }> {
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const text = await res.text().catch(() => "");
  return { ok: res.ok, text, status: res.status };
}

export async function POST(_req: NextRequest) {
  try {
    if (!GAS_MYPAGE_URL) return fail("server_config_error", 500);

    // ---- server timing instrumentation ----
    const t0 = Date.now();
    const marks: Record<string, number> = {};
    const mark = (k: string) => {
      marks[k] = Date.now();
    };
    const dur = (a: string, b: string) => {
      const ta = marks[a] ?? t0;
      const tb = marks[b] ?? Date.now();
      return tb - ta;
    };
    const timingParts: string[] = [];
    const addTiming = (name: string, ms: number) => {
      timingParts.push(`${name};dur=${Math.max(0, Math.round(ms))}`);
    };

    const cookieStore = await cookies();
    const getCookieValue = (name: string): string => cookieStore.get(name)?.value ?? "";

    const patientId = getCookieValue("__Host-patient_id") || getCookieValue("patient_id");
    if (!patientId) return fail("unauthorized", 401);

    const lineUserId = getCookieValue("__Host-line_user_id") || getCookieValue("line_user_id");
    const lineSavedFlag = getCookieValue("__Host-line_user_id_saved") || getCookieValue("line_user_id_saved");

    const dashboardUrl = `${GAS_MYPAGE_URL}?type=getDashboard&patient_id=${encodeURIComponent(patientId)}`;
    const intakeUrl =
      GAS_INTAKE_LIST_URL
        ? `${GAS_INTAKE_LIST_URL}?type=hasIntakeByPid&patient_id=${encodeURIComponent(patientId)}`
        : "";

    // ---- fetch in parallel ----
    mark("fetch_start");

    const [dash, intake] = await Promise.all([
      (async () => {
        mark("dash_start");
        const r = await fetchJsonText(dashboardUrl);
        mark("dash_end");
        return r;
      })(),
      intakeUrl
        ? (async () => {
            mark("intake_start");
            const r = await fetchJsonText(intakeUrl);
            mark("intake_end");
            return r;
          })()
        : Promise.resolve({ ok: false, text: "", status: 0 }),
    ]);

    mark("fetch_end");

    if (!dash.ok) {
      console.error("GAS getDashboard HTTP error:", dash.status);
      return fail("gas_error", 500);
    }

    mark("parse_start");
    let gasJson: GasDashboardResponse;
    try {
      gasJson = JSON.parse(dash.text) as GasDashboardResponse;
    } catch {
      console.error("GAS getDashboard JSON parse error");
      return fail("gas_invalid_json", 500);
    } finally {
      mark("parse_end");
    }

    // ---- hasIntake parse ----
    mark("intake_parse_start");
    let hasIntake = false;
    let intakeId = "";
    if (intakeUrl && intake.ok) {
      try {
        const j = intake.text ? JSON.parse(intake.text) : {};
        if (j?.ok === true) {
          hasIntake = !!j.exists;
          intakeId = safeStr(j.intakeId || "");
        }
      } catch {
        // ignore
      }
    }
    mark("intake_parse_end");

    // ---- line_user_id save decision ----
    const existingLineUserId = safeStr(gasJson.patient?.line_user_id).trim();
    const shouldSaveLineUserId = !!lineUserId && !existingLineUserId && lineSavedFlag !== "1";

    // ---- map payload ----
    mark("map_start");

    const mapOrder = (o: any): OrderForMyPage => {
      const paidAt = o.paid_at_jst ? toIsoFromJstDateTime(o.paid_at_jst) : "";
      const refundStatus = normalizeRefundStatus(o.refund_status);
      const refundedAt = o.refunded_at_jst ? toIsoFromJstDateTime(o.refunded_at_jst) : "";

      const shippingEtaIso = o.shipping_eta ? toIsoFromJstDateOrDateTime(o.shipping_eta) : "";
      const shippingEta = shippingEtaIso || (safeStr(o.shipping_eta) || undefined);

      const carrier =
        normalizeCarrier(o.carrier) ??
        inferCarrierFromDates({ shippingEta: shippingEtaIso || "", paidAt });

      return {
        id: safeStr(o.id),
        productCode: safeStr(o.product_code),
        productName: safeStr(o.product_name),
        amount: Number(o.amount) || 0,
        paidAt,
        shippingStatus: (safeStr(o.shipping_status) || "pending") as ShippingStatus,
        shippingEta,
        trackingNumber: safeStr(o.tracking_number) || undefined,
        paymentStatus: normalizePaymentStatus(o.payment_status),
        carrier,
        refundStatus,
        refundedAt: refundedAt || undefined,
        refundedAmount: toNumberOrUndefined(o.refunded_amount),
      };
    };

    const ordersAll: OrderForMyPage[] = Array.isArray(gasJson.orders)
      ? gasJson.orders.map(mapOrder)
      : [];

    const payload = {
      ok: true,
      patient: gasJson.patient?.id
        ? {
            id: safeStr(gasJson.patient.id),
            displayName: safeStr(gasJson.patient.displayName || ""),
          }
        : undefined,
      nextReservation: gasJson.nextReservation
        ? {
            id: safeStr(gasJson.nextReservation.id),
            datetime: safeStr(gasJson.nextReservation.datetime),
            title: safeStr(gasJson.nextReservation.title),
            status: safeStr(gasJson.nextReservation.status),
          }
        : null,
      activeOrders: ordersAll.filter((o) => o.refundStatus !== "COMPLETED"),
      orders: ordersAll,
      ordersFlags: {
        canPurchaseCurrentCourse: gasJson.flags?.canPurchaseCurrentCourse ?? false,
        canApplyReorder: gasJson.flags?.canApplyReorder ?? false,
        hasAnyPaidOrder:
          gasJson.flags?.hasAnyPaidOrder ?? (Array.isArray(gasJson.orders) ? gasJson.orders.length > 0 : false),
      },
      reorders: Array.isArray(gasJson.reorders)
        ? gasJson.reorders.map((r: any) => ({
            id: safeStr(r.id),
            status: safeStr(r.status),
            createdAt: safeStr(r.createdAt),
            productCode: safeStr(r.productCode ?? r.product_code),
            mg: safeStr(r.mg),
            months: Number(r.months) || undefined,
          }))
        : [],
      history: Array.isArray(gasJson.history)
        ? gasJson.history.map((h: any, idx: number) => ({
            id: safeStr(h.id || h.history_id || `${idx}`),
            date: safeStr(h.date || h.createdAt || h.paid_at_jst || ""),
            title: safeStr(h.title || h.product_name || h.menu || ""),
            detail: safeStr(h.detail || h.note || h.description || ""),
          }))
        : [],
      hasIntake,
      intakeId,
    };

    mark("map_end");

// ---- prepare response ----
addTiming("dash_fetch", dur("dash_start", "dash_end"));
if (intakeUrl) addTiming("intake_fetch", dur("intake_start", "intake_end"));
addTiming("json_parse", dur("parse_start", "parse_end"));
addTiming("intake_parse", dur("intake_parse_start", "intake_parse_end"));
addTiming("map", dur("map_start", "map_end"));
addTiming("total", Date.now() - t0);

// ★ 確実に Server-Timing を返す（Headers で組む）
const headers = new Headers(noCacheHeaders);
headers.set("Server-Timing", timingParts.join(", "));

const res = NextResponse.json(payload, { status: 200, headers });

// ---- async save line_user_id only when missing ----
if (shouldSaveLineUserId) {
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

  res.cookies.set({
    name: "__Host-line_user_id_saved",
    value: "1",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
  });
}

return res;

  } catch (err) {
    console.error("POST /api/mypage error", err);
    return fail("unexpected_error", 500);
  }
}
