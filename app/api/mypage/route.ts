// app/api/mypage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis, getDashboardCacheKey } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { validateBody } from "@/lib/validations/helpers";
import { mypageDashboardSchema } from "@/lib/validations/mypage";

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
  postalCode?: string;
  address?: string;
  shippingName?: string;
  shippingListCreatedAt?: string;
};

type OrdersFlags = {
  canPurchaseCurrentCourse: boolean;
  canApplyReorder: boolean;
  hasAnyPaidOrder: boolean;
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

// ─── Supabase クエリ ───

/**
 * 患者基本情報を取得（patients + intake テーブルから）
 */
async function getPatientInfoFromSupabase(
  patientId: string,
  tenantId: string | null
): Promise<{ id: string; displayName: string; lineId: string; hasIntake: boolean; intakeStatus: string | null } | null> {
  try {
    // patients と intake を並列取得
    const [patientRes, intakeRes] = await Promise.all([
      withTenant(supabaseAdmin
        .from("patients")
        .select("patient_id, name, line_id")
        .eq("patient_id", patientId), tenantId)
        .maybeSingle(),
      withTenant(supabaseAdmin
        .from("intake")
        .select("patient_id, status, answers")
        .eq("patient_id", patientId)
        .not("answers", "is", null), tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const patient = patientRes.data;
    const intake = intakeRes.data;

    if (!patient && !intake) {
      return { id: patientId, displayName: "", lineId: "", hasIntake: false, intakeStatus: null };
    }

    const answers = intake?.answers as Record<string, unknown> | null;
    const hasCompletedQuestionnaire = !!answers && typeof answers.ng_check === "string" && answers.ng_check !== "";

    return {
      id: patientId,
      displayName: patient?.name || "",
      lineId: patient?.line_id || "",
      hasIntake: hasCompletedQuestionnaire,
      intakeStatus: intake?.status || null,
    };
  } catch (err) {
    console.error("[Supabase] getPatientInfo error:", err);
    return { id: patientId, displayName: "", lineId: "", hasIntake: false, intakeStatus: null };
  }
}

/**
 * 予約情報を取得（reservations テーブルから）
 */
async function getNextReservationFromSupabase(
  patientId: string,
  tenantId: string | null
): Promise<{ id: string; datetime: string; title: string; status: string } | null> {
  try {
    const { data, error } = await withTenant(supabaseAdmin
      .from("reservations")
      .select("reserve_id, reserved_date, reserved_time, status")
      .eq("patient_id", patientId), tenantId)
      .neq("status", "canceled")
      .not("reserved_date", "is", null)
      .not("reserved_time", "is", null)
      .order("reserved_date", { ascending: true })
      .order("reserved_time", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

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
 * 診察履歴を取得（status=OKの診察完了分、reservations からの日時・処方メニュー使用）
 */
async function getConsultationHistoryFromSupabase(
  patientId: string,
  tenantId: string | null
): Promise<ConsultationHistory[]> {
  try {
    // intake(診察完了分) と reservations を並列取得
    const [intakeRes, resRes] = await Promise.all([
      withTenant(supabaseAdmin
        .from("intake")
        .select("reserve_id, status, note, updated_at")
        .eq("patient_id", patientId)
        .eq("status", "OK"), tenantId)
        .order("updated_at", { ascending: false }),
      withTenant(supabaseAdmin
        .from("reservations")
        .select("reserve_id, reserved_date, reserved_time, prescription_menu")
        .eq("patient_id", patientId), tenantId),
    ]);

    if (intakeRes.error) {
      console.error("[Supabase] getConsultationHistory error:", intakeRes.error);
      return [];
    }

    const resMap = new Map((resRes.data || []).map((r: any) => [r.reserve_id, r]));

    return (intakeRes.data || []).map((row: any) => {
      const res = row.reserve_id ? resMap.get(row.reserve_id) : null;
      const date = res?.reserved_date || row.updated_at?.split("T")[0] || "";
      const prescriptionMenu = res?.prescription_menu || "";
      const title = `診察完了${prescriptionMenu ? ` (${prescriptionMenu})` : ""}`;

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
 * 注文情報を取得
 */
async function getOrdersFromSupabase(patientId: string, tenantId: string | null): Promise<OrderForMyPage[]> {
  try {
    const { data, error } = await withTenant(supabaseAdmin
      .from("orders")
      .select("*")
      .eq("patient_id", patientId), tenantId)
      .order("paid_at", { ascending: false });

    if (error) {
      console.error("[Supabase] getOrders error:", error);
      return [];
    }

    return (data || []).map((o: any) => {
      const paidAt = o.paid_at || o.created_at || "";
      const refundStatus = normalizeRefundStatus(o.refund_status);
      const refundedAt = o.refunded_at || "";

      const shippingEta = o.shipping_date || undefined;
      const carrier =
        normalizeCarrier(o.carrier) ??
        inferCarrierFromDates({ shippingEta: shippingEta || "", paidAt });

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
        postalCode: o.postal_code || undefined,
        address: o.address || undefined,
        shippingName: (o.shipping_name && o.shipping_name !== "null") ? o.shipping_name : undefined,
        shippingListCreatedAt: o.shipping_list_created_at || undefined,
      };
    });
  } catch (err) {
    console.error("[Supabase] getOrders error:", err);
    return [];
  }
}

/**
 * reorders情報を取得
 */
async function getReordersFromSupabase(patientId: string, tenantId: string | null): Promise<{
  id: string;
  status: string;
  createdAt: string;
  productCode: string;
  mg: string;
  months: number | undefined;
}[]> {
  try {
    const { data, error } = await withTenant(supabaseAdmin
      .from("reorders")
      .select("id, status, created_at, product_code, reorder_number")
      .eq("patient_id", patientId), tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Supabase] getReorders error:", error);
      return [];
    }

    return (data || []).map((r: any) => {
      const productCode = String(r.product_code || "");
      const mgMatch = productCode.match(/(\d+\.?\d*mg)/);
      const monthsMatch = productCode.match(/(\d+)m$/);

      return {
        id: String(r.id),
        reorder_number: r.reorder_number ? Number(r.reorder_number) : null,
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

// ─── メインAPI ───

export async function POST(_req: NextRequest) {
  try {
    // refreshパラメータを取得（決済完了後の強制リフレッシュ用）
    let forceRefresh = false;
    try {
      const raw = await _req.json().catch(() => ({}));
      const parsed = validateBody(raw, mypageDashboardSchema);
      if (!("error" in parsed)) {
        forceRefresh = parsed.data.refresh === true || parsed.data.refresh === "1";
      }
    } catch {
      // bodyが空の場合は無視
    }

    const cookieStore = await cookies();
    const getCookieValue = (name: string): string => cookieStore.get(name)?.value ?? "";

    const patientId = getCookieValue("__Host-patient_id") || getCookieValue("patient_id");
    if (!patientId) return fail("unauthorized", 401);

    const tenantId = resolveTenantId(_req);
    const lineUserId = getCookieValue("__Host-line_user_id") || getCookieValue("line_user_id");

    // ★ line_user_id と patient_id の整合性チェック（アカウント切替による他人データ表示防止）
    if (lineUserId && patientId) {
      const { data: patientCheck } = await withTenant(supabaseAdmin
        .from("patients")
        .select("line_id")
        .eq("patient_id", patientId), tenantId)
        .maybeSingle();

      if (patientCheck?.line_id && patientCheck.line_id !== lineUserId) {
        console.log(`[mypage API] PID mismatch: cookie=${patientId} line_id=${patientCheck.line_id} current=${lineUserId}`);
        return fail("pid_mismatch", 401);
      }
    }

    // キャッシュチェック（forceRefreshの場合はスキップ）
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

    // ★ 全クエリをPromise.allで並列実行（GAS呼び出し廃止）
    const [patientInfo, nextReservation, ordersAll, reorders, history] = await Promise.all([
      getPatientInfoFromSupabase(patientId, tenantId),
      getNextReservationFromSupabase(patientId, tenantId),
      getOrdersFromSupabase(patientId, tenantId),
      getReordersFromSupabase(patientId, tenantId),
      getConsultationHistoryFromSupabase(patientId, tenantId),
    ]);

    const hasIntake = patientInfo?.hasIntake ?? false;

    // LINE UID がDBに未保存ならDB更新（非同期・画面は待たせない）
    const existingLineId = patientInfo?.lineId || "";
    const shouldSaveLineId = !!lineUserId && !existingLineId;

    // ordersFlags を計算
    // ★ NG患者は購入不可
    const isNG = patientInfo?.intakeStatus === "NG";
    const hasAnyPaidOrder = ordersAll.length > 0;
    const ordersFlags: OrdersFlags = {
      canPurchaseCurrentCourse: !hasAnyPaidOrder && !isNG,
      canApplyReorder: hasAnyPaidOrder && !isNG,
      hasAnyPaidOrder,
    };

    const payload = {
      ok: true,
      patient: {
        id: patientInfo?.id || patientId,
        displayName: patientInfo?.displayName || "",
      },
      nextReservation,
      activeOrders: ordersAll.filter((o) => o.refundStatus !== "COMPLETED"),
      orders: ordersAll,
      ordersFlags,
      reorders,
      history: history.map((h) => ({
        id: h.id,
        date: h.date,
        title: h.title,
        detail: h.detail,
      })),
      hasIntake,
      intakeId: "",
      intakeStatus: patientInfo?.intakeStatus || null,
    };

    // キャッシュ保存（TTL=30分）
    try {
      await redis.set(cacheKey, payload, { ex: 1800 });
      console.log(`[Cache] Saved: ${cacheKey} (30min)`);
    } catch (error) {
      console.error(`[Cache] Failed to save cache: ${error}`);
    }

    const res = NextResponse.json(payload, { status: 200, headers: noCacheHeaders });

    // LINE UID がDBにない場合、非同期で patients を更新（intake の line_id は不要）
    if (shouldSaveLineId) {
      withTenant(supabaseAdmin
        .from("patients")
        .update({ line_id: lineUserId })
        .eq("patient_id", patientId), tenantId)
        .then(({ error }) => {
          if (error) console.error("[Mypage] patients line_id update error:", error.message);
          else console.log("[Mypage] line_id updated for", patientId);
        });
    }

    return res;
  } catch (err) {
    console.error("POST /api/mypage error", err);
    return fail("unexpected_error", 500);
  }
}
