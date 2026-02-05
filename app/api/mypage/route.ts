// app/api/mypage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis, getDashboardCacheKey } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const USE_SUPABASE = process.env.USE_SUPABASE === "true";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  paymentMethod?: "credit_card" | "bank_transfer";
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

type GasDashboardResponse = {
  patient?: {
    id: string;
    displayName?: string;
    line_user_id?: string;
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

  // ★GAS側 getDashboard に追加した想定
  hasIntake?: boolean;
  intakeId?: string;
  perf?: any[];
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

/**
 * Supabaseから予約情報を取得
 */
async function getNextReservationFromSupabase(
  patientId: string
): Promise<{ id: string; datetime: string; title: string; status: string } | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("intake")
      .select("reserve_id, reserved_date, reserved_time, patient_name, status")
      .eq("patient_id", patientId)
      .not("reserve_id", "is", null)
      .not("reserved_date", "is", null)
      .not("reserved_time", "is", null)
      // ★ 診察完了(OK/NG)とキャンセルを除外 - 未診察の予約のみ取得
      .or("status.is.null,status.eq.")
      .order("reserved_date", { ascending: true })
      .order("reserved_time", { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      console.log(`[Supabase] No reservation found for patient_id=${patientId}`);
      return null;
    }

    // GASと同じ形式に変換
    const datetime = `${data.reserved_date} ${data.reserved_time}`;
    return {
      id: data.reserve_id,
      datetime,
      title: "診察予約",
      status: "confirmed",
    };
  } catch (err) {
    console.error("[Supabase] getNextReservation error:", err);
    return null;
  }
}

type ConsultationHistory = {
  id: string;
  date: string;
  title: string;
  detail: string;
  status: string;
  prescriptionMenu?: string;
};

/**
 * Supabaseから診察履歴を取得（status=OK/NGの診察完了分）
 */
async function getConsultationHistoryFromSupabase(
  patientId: string
): Promise<ConsultationHistory[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("intake")
      .select("reserve_id, reserved_date, reserved_time, status, note, prescription_menu, updated_at")
      .eq("patient_id", patientId)
      .eq("status", "OK")  // ★ NGは決済不可のため除外
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[Supabase] getConsultationHistory error:", error);
      return [];
    }

    return (data || []).map((row: any) => {
      const date = row.reserved_date || row.updated_at?.split("T")[0] || "";
      const prescriptionMenu = row.prescription_menu || "";
      const title = row.status === "OK"
        ? `診察完了${prescriptionMenu ? ` (${prescriptionMenu})` : ""}`
        : "診察完了（処方なし）";

      return {
        id: row.reserve_id || `history-${row.updated_at}`,
        date,
        title,
        detail: row.note || "",
        status: row.status,
        prescriptionMenu,
      };
    });
  } catch (err) {
    console.error("[Supabase] getConsultationHistory error:", err);
    return [];
  }
}

/**
 * Supabaseから注文情報を取得（ordersテーブルのみ - bank_transfer_ordersは廃止済み）
 */
async function getOrdersFromSupabase(patientId: string): Promise<OrderForMyPage[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("patient_id", patientId)
      .order("paid_at", { ascending: false });

    if (error) {
      console.error("[Supabase] getOrders error:", error);
      return [];
    }

    const orders = (data || []).map((o: any) => {
      const paidAt = o.paid_at || o.created_at || "";
      const refundStatus = normalizeRefundStatus(o.refund_status);
      const refundedAt = o.refunded_at || "";

      const shippingEta = o.shipping_date || undefined;
      const carrier =
        normalizeCarrier(o.carrier) ??
        inferCarrierFromDates({ shippingEta: shippingEta || "", paidAt });

      // status='pending_confirmation'の場合はpaymentStatusを'pending'にする
      let paymentStatus = normalizePaymentStatus(o.payment_status);
      if (o.status === "pending_confirmation") {
        paymentStatus = "pending" as PaymentStatus;
      }

      return {
        id: o.id,
        productCode: o.product_code || "",
        productName: o.product_name || "",
        amount: o.amount || 0,
        paidAt,
        shippingStatus: (o.shipping_status || "pending") as ShippingStatus,
        shippingEta,
        trackingNumber: o.tracking_number || undefined,
        paymentStatus,
        paymentMethod: (o.payment_method === "bank_transfer" ? "bank_transfer" : "credit_card") as "credit_card" | "bank_transfer",
        carrier,
        refundStatus,
        refundedAt: refundedAt || undefined,
        refundedAmount: o.refunded_amount || undefined,
      };
    });

    return orders;
  } catch (err) {
    console.error("[Supabase] getOrders error:", err);
    return [];
  }
}

/**
 * Supabaseからreorders情報を取得
 */
async function getReordersFromSupabase(patientId: string): Promise<{
  id: string;
  status: string;
  createdAt: string;
  productCode: string;
  mg: string;
  months: number | undefined;
}[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("reorders")
      .select("id, status, created_at, product_code, gas_row_number")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] getReorders error:", error);
      return [];
    }

    return (data || []).map((r: any) => {
      // product_code から mg と months を抽出（例: "MJL_2.5mg_3m" → mg="2.5mg", months=3）
      const productCode = String(r.product_code || "");
      const mgMatch = productCode.match(/(\d+\.?\d*mg)/);
      const monthsMatch = productCode.match(/(\d+)m$/);

      return {
        id: String(r.id),
        gas_row_number: r.gas_row_number ? Number(r.gas_row_number) : null,
        status: String(r.status || ""),
        createdAt: r.created_at || "",
        productCode,
        mg: mgMatch ? mgMatch[1] : "",
        months: monthsMatch ? Number(monthsMatch[1]) : undefined,
      };
    });
  } catch (err) {
    console.error("[Supabase] getReorders error:", err);
    return [];
  }
}

export async function POST(_req: NextRequest) {
  try {
    if (!GAS_MYPAGE_URL) return fail("server_config_error", 500);

    // ★ refreshパラメータを取得（決済完了後の強制リフレッシュ用）
    let forceRefresh = false;
    try {
      const body = await _req.json().catch(() => ({}));
      forceRefresh = body.refresh === true || body.refresh === "1";
    } catch {
      // bodyが空の場合は無視
    }

    const cookieStore = await cookies();
    const getCookieValue = (name: string): string => cookieStore.get(name)?.value ?? "";

    const patientId = getCookieValue("__Host-patient_id") || getCookieValue("patient_id");
    if (!patientId) return fail("unauthorized", 401);

    const lineUserId = getCookieValue("__Host-line_user_id") || getCookieValue("line_user_id");
    const lineSavedFlag =
      getCookieValue("__Host-line_user_id_saved") || getCookieValue("line_user_id_saved");

    // ★ キャッシュチェック（forceRefreshの場合はスキップ）
    const cacheKey = getDashboardCacheKey(patientId);

    if (!forceRefresh) {
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          console.log(`[Cache] Hit: ${cacheKey}`);
          return NextResponse.json(cachedData, { status: 200, headers: noCacheHeaders });
        }
      } catch (error) {
        console.error("[Cache] Failed to get cache:", error);
      }
    } else {
      console.log(`[Cache] Force refresh requested, skipping cache: ${cacheKey}`);
    }
    console.log(`[Cache] Miss: ${cacheKey}`);

    console.log(`[Mypage] USE_SUPABASE=${USE_SUPABASE}`);

    // ★ Supabaseモードでは軽量GAS呼び出し（patient情報のみ）
    let gasJson: GasDashboardResponse;
    let hasIntake = false;
    let intakeId = "";
    let existingLineUserId = "";
    let shouldSaveLineUserId = false;

    if (USE_SUPABASE) {
      // ★ Supabaseモード：patient情報とreordersのみGASから取得（light=1で注文スキップ）
      const lightDashboardUrl = `${GAS_MYPAGE_URL}?type=getDashboard&patient_id=${encodeURIComponent(patientId)}&light=1`;
      console.log(`[Mypage] USE_SUPABASE=true, calling GAS with light=1`);
      const dash = await fetchJsonText(lightDashboardUrl);

      if (!dash.ok) {
        console.error("GAS getDashboard HTTP error:", dash.status);
        return fail("gas_error", 500);
      }

      try {
        gasJson = JSON.parse(dash.text) as GasDashboardResponse;
      } catch {
        console.error("GAS getDashboard JSON parse error");
        return fail("gas_invalid_json", 500);
      }

      hasIntake = gasJson.hasIntake === true;
      intakeId = safeStr(gasJson.intakeId || "");
      existingLineUserId = safeStr(gasJson.patient?.line_user_id).trim();
      shouldSaveLineUserId = !!lineUserId && !existingLineUserId && lineSavedFlag !== "1";
    } else {
      // ★ GASモード：従来通り全データ取得
      const dashboardUrl = `${GAS_MYPAGE_URL}?type=getDashboard&patient_id=${encodeURIComponent(patientId)}`;
      const dash = await fetchJsonText(dashboardUrl);

      if (!dash.ok) {
        console.error("GAS getDashboard HTTP error:", dash.status);
        return fail("gas_error", 500);
      }

      try {
        gasJson = JSON.parse(dash.text) as GasDashboardResponse;
      } catch {
        console.error("GAS getDashboard JSON parse error");
        return fail("gas_invalid_json", 500);
      }

      hasIntake = gasJson.hasIntake === true;
      intakeId = safeStr(gasJson.intakeId || "");
      existingLineUserId = safeStr(gasJson.patient?.line_user_id).trim();
      shouldSaveLineUserId = !!lineUserId && !existingLineUserId && lineSavedFlag !== "1";
    }

    // ★ USE_SUPABASE=true の場合は注文情報・reordersをSupabaseから取得
    let ordersAll: OrderForMyPage[] = [];
    let nextReservation: { id: string; datetime: string; title: string; status: string } | null = null;
    let reordersFromSupabase: { id: string; status: string; createdAt: string; productCode: string; mg: string; months: number | undefined }[] = [];
    let historyFromSupabase: ConsultationHistory[] = [];

    if (USE_SUPABASE) {
      console.log(`[Supabase] Fetching orders, reservation, reorders, and history for patient_id=${patientId}`);

      // 注文情報をSupabaseから取得
      ordersAll = await getOrdersFromSupabase(patientId);
      console.log(`[Supabase] Retrieved ${ordersAll.length} orders from Supabase`);

      // 予約情報をSupabaseから取得
      nextReservation = await getNextReservationFromSupabase(patientId);
      console.log(`[Supabase] Retrieved reservation: ${nextReservation ? nextReservation.id : 'none'}`);

      // ★ reordersをSupabaseから取得
      reordersFromSupabase = await getReordersFromSupabase(patientId);
      console.log(`[Supabase] Retrieved ${reordersFromSupabase.length} reorders from Supabase`);

      // ★ 診察履歴をSupabaseから取得
      historyFromSupabase = await getConsultationHistoryFromSupabase(patientId);
      console.log(`[Supabase] Retrieved ${historyFromSupabase.length} history from Supabase`);
    } else {
      console.log(`[Mypage] Using GAS for orders (USE_SUPABASE=false)`);
      // GASから取得（従来通り）
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
          paymentMethod: (o.payment_method === "bank_transfer" ? "bank_transfer" : "credit_card") as "credit_card" | "bank_transfer",
          carrier,
          refundStatus,
          refundedAt: refundedAt || undefined,
          refundedAmount: toNumberOrUndefined(o.refunded_amount),
        };
      };

      ordersAll = Array.isArray(gasJson.orders)
        ? gasJson.orders.map(mapOrder)
        : [];

      nextReservation = gasJson.nextReservation
        ? {
            id: safeStr(gasJson.nextReservation.id),
            datetime: safeStr(gasJson.nextReservation.datetime),
            title: safeStr(gasJson.nextReservation.title),
            status: safeStr(gasJson.nextReservation.status),
          }
        : null;
    }

    // ★ ordersFlags を計算（Supabase or GAS）
    const hasAnyPaidOrder = ordersAll.length > 0;
    const ordersFlags = USE_SUPABASE
      ? {
          canPurchaseCurrentCourse: !hasAnyPaidOrder,
          canApplyReorder: hasAnyPaidOrder,
          hasAnyPaidOrder,
        }
      : {
          canPurchaseCurrentCourse: gasJson.flags?.canPurchaseCurrentCourse ?? false,
          canApplyReorder: gasJson.flags?.canApplyReorder ?? false,
          hasAnyPaidOrder:
            gasJson.flags?.hasAnyPaidOrder ??
            (Array.isArray(gasJson.orders) ? gasJson.orders.length > 0 : false),
        };

    const payload = {
      ok: true,
      patient: gasJson.patient?.id
        ? {
            id: safeStr(gasJson.patient.id),
            displayName: safeStr(gasJson.patient.displayName || ""),
          }
        : undefined,
      nextReservation,
      activeOrders: ordersAll.filter((o) => o.refundStatus !== "COMPLETED"),
      orders: ordersAll,
      ordersFlags,
      // ★ USE_SUPABASE=true の場合は Supabase から取得した reorders を使用
      reorders: USE_SUPABASE
        ? reordersFromSupabase
        : Array.isArray(gasJson.reorders)
          ? gasJson.reorders.map((r: any) => ({
              id: safeStr(r.id),
              status: safeStr(r.status),
              createdAt: safeStr(r.createdAt),
              productCode: safeStr(r.productCode ?? r.product_code),
              mg: safeStr(r.mg),
              months: Number(r.months) || undefined,
            }))
          : [],
      // ★ USE_SUPABASE=true の場合はDBから取得した診察履歴を使用
      history: USE_SUPABASE
        ? historyFromSupabase.map((h) => ({
            id: h.id,
            date: h.date,
            title: h.title,
            detail: h.detail,
          }))
        : Array.isArray(gasJson.history)
          ? gasJson.history.map((h: any, idx: number) => ({
              id: safeStr(h.id || h.history_id || `${idx}`),
              date: safeStr(h.date || h.createdAt || h.paid_at_jst || ""),
              title: safeStr(h.title || h.product_name || h.menu || ""),
              detail: safeStr(h.detail || h.note || h.description || ""),
            }))
          : [],
      hasIntake,
      intakeId,

      // ★追加：GASのperfをそのまま返す
      perf: (gasJson as any).perf || [],
    };

    // ★ キャッシュ保存（TTL=30分）
    console.log(`[Cache] Attempting to save: ${cacheKey}`);
    console.log(`[Cache] Payload size: ${JSON.stringify(payload).length} bytes`);
    try {
      const result = await redis.set(cacheKey, payload, { ex: 1800 });
      console.log(`[Cache] Redis.set result:`, result);
      console.log(`[Cache] Saved: ${cacheKey} (30min)`);
    } catch (error) {
      console.error(`[Cache] Failed to save cache: ${error}`);
      console.error(`[Cache] Error details:`, error);
    }

    const res = NextResponse.json(payload, { status: 200, headers: noCacheHeaders });

    // 非同期で保存（画面は待たせない）
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
