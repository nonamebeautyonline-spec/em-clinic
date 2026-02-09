// app/api/mypage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis, getDashboardCacheKey } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";

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
 * 患者基本情報を取得（intakeテーブルから）
 */
async function getPatientInfoFromSupabase(
  patientId: string
): Promise<{ id: string; displayName: string; lineId: string; hasIntake: boolean; intakeStatus: string | null } | null> {
  try {
    // 最新intake（患者名・LINE ID・ステータス用）
    const { data, error } = await supabaseAdmin
      .from("intake")
      .select("patient_id, patient_name, line_id, status, answers")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { id: patientId, displayName: "", lineId: "", hasIntake: false, intakeStatus: null };
    }

    // 問診完了 = answersにng_check（問診の必須項目）があるintakeが1件でもあるか
    // ※ 再処方カルテもintakeに入るため最新1件だけでは判定できない
    let hasCompletedQuestionnaire = false;
    const answers = data.answers as Record<string, unknown> | null;
    if (answers && typeof answers.ng_check === "string" && answers.ng_check !== "") {
      hasCompletedQuestionnaire = true;
    } else {
      // 最新がカルテ等の場合、過去のintakeを確認
      const { data: prev } = await supabaseAdmin
        .from("intake")
        .select("id")
        .eq("patient_id", patientId)
        .not("answers", "is", null)
        .filter("answers->ng_check", "neq", null)
        .limit(1)
        .maybeSingle();
      hasCompletedQuestionnaire = !!prev;
    }

    // intakeStatus は answers 付きの最新レコードから取得
    let intakeStatus = data.status || null;
    if (!intakeStatus && hasCompletedQuestionnaire) {
      const { data: statusRow } = await supabaseAdmin
        .from("intake")
        .select("status")
        .eq("patient_id", patientId)
        .not("status", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      intakeStatus = statusRow?.status || null;
    }

    return {
      id: data.patient_id,
      displayName: data.patient_name || "",
      lineId: data.line_id || "",
      hasIntake: hasCompletedQuestionnaire,
      intakeStatus,
    };
  } catch (err) {
    console.error("[Supabase] getPatientInfo error:", err);
    return { id: patientId, displayName: "", lineId: "", hasIntake: false, intakeStatus: null };
  }
}

/**
 * 予約情報を取得
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
      .or("status.is.null,status.eq.")
      .order("reserved_date", { ascending: true })
      .order("reserved_time", { ascending: true })
      .limit(1)
      .single();

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
 * 診察履歴を取得（status=OKの診察完了分）
 */
async function getConsultationHistoryFromSupabase(
  patientId: string
): Promise<ConsultationHistory[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("intake")
      .select("reserve_id, reserved_date, reserved_time, status, note, prescription_menu, updated_at")
      .eq("patient_id", patientId)
      .eq("status", "OK")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[Supabase] getConsultationHistory error:", error);
      return [];
    }

    return (data || []).map((row: any) => {
      const date = row.reserved_date || row.updated_at?.split("T")[0] || "";
      const prescriptionMenu = row.prescription_menu || "";
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

// ─── メインAPI ───

export async function POST(_req: NextRequest) {
  try {
    // refreshパラメータを取得（決済完了後の強制リフレッシュ用）
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
      getPatientInfoFromSupabase(patientId),
      getNextReservationFromSupabase(patientId),
      getOrdersFromSupabase(patientId),
      getReordersFromSupabase(patientId),
      getConsultationHistoryFromSupabase(patientId),
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

    // LINE UID がDBにない場合、非同期でDB保存
    if (shouldSaveLineId) {
      supabaseAdmin
        .from("intake")
        .update({ line_id: lineUserId })
        .eq("patient_id", patientId)
        .then(({ error }) => {
          if (error) {
            console.error("[Mypage] DB line_id update error:", error.message);
          } else {
            console.log("[Mypage] DB line_id updated for", patientId);
          }
        });
    }

    return res;
  } catch (err) {
    console.error("POST /api/mypage error", err);
    return fail("unexpected_error", 500);
  }
}
