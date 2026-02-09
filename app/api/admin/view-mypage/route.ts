// app/api/admin/view-mypage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ShippingStatus = "pending" | "preparing" | "shipped" | "delivered";
type PaymentStatus = "paid" | "pending" | "failed" | "refunded";
type RefundStatus = "PENDING" | "COMPLETED" | "FAILED" | "UNKNOWN";

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
  refundStatus?: RefundStatus;
  refundedAt?: string;
  refundedAmount?: number;
};

function toIsoFlexible(v: any): string {
  const s = (typeof v === "string" ? v : String(v ?? "")).trim();
  if (!s) return "";

  if (s.includes("T")) return s;

  if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    const replaced = s.replace(/\//g, "-");
    const withSec = /:\d{2}:\d{2}$/.test(replaced) ? replaced : replaced + ":00";
    return withSec.replace(" ", "T") + "+09:00";
  }

  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) {
    return s.replace(" ", "T") + "+09:00";
  }

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
    const parts = s.replace(/\//g, "-").split("-");
    const y = parts[0];
    const mm = parts[1].padStart(2, "0");
    const dd = parts[2].padStart(2, "0");
    return `${y}-${mm}-${dd}T00:00:00+09:00`;
  }

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

// ─── Supabase クエリ ───

async function getPatientInfoFromSupabase(
  patientId: string
): Promise<{ id: string; displayName: string; lineId: string; hasIntake: boolean; intakeStatus: string | null }> {
  try {
    // 最初のintake（問診本体）を取得 — 再処方カルテより必ず古い
    const { data, error } = await supabase
      .from("intake")
      .select("patient_id, patient_name, line_id, status, answers")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      return { id: patientId, displayName: "", lineId: "", hasIntake: false, intakeStatus: null };
    }

    const answers = data.answers as Record<string, unknown> | null;
    const hasCompletedQuestionnaire = !!answers && typeof answers.ng_check === "string" && answers.ng_check !== "";

    return {
      id: data.patient_id,
      displayName: data.patient_name || "",
      lineId: data.line_id || "",
      hasIntake: hasCompletedQuestionnaire,
      intakeStatus: data.status || null,
    };
  } catch {
    return { id: patientId, displayName: "", lineId: "", hasIntake: false, intakeStatus: null };
  }
}

async function getNextReservationFromSupabase(
  patientId: string
): Promise<{ id: string; datetime: string; title: string; status: string } | null> {
  try {
    const { data, error } = await supabase
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

    if (error || !data) return null;

    const datetime = `${data.reserved_date} ${data.reserved_time}`;
    return { id: data.reserve_id, datetime, title: "診察予約", status: "confirmed" };
  } catch {
    return null;
  }
}

type ConsultationHistory = {
  id: string;
  date: string;
  title: string;
  detail: string;
};

async function getConsultationHistoryFromSupabase(
  patientId: string
): Promise<ConsultationHistory[]> {
  try {
    const { data, error } = await supabase
      .from("intake")
      .select("reserve_id, reserved_date, reserved_time, status, note, prescription_menu, updated_at")
      .eq("patient_id", patientId)
      .eq("status", "OK")
      .order("updated_at", { ascending: false });

    if (error) return [];

    return (data || []).map((row: any) => {
      const date = row.reserved_date || row.updated_at?.split("T")[0] || "";
      const prescriptionMenu = row.prescription_menu || "";
      const title = `診察完了${prescriptionMenu ? ` (${prescriptionMenu})` : ""}`;

      return {
        id: row.reserve_id || `history-${row.updated_at}`,
        date,
        title,
        detail: row.note || "",
      };
    });
  } catch {
    return [];
  }
}

async function getOrdersFromSupabase(patientId: string): Promise<OrderForMyPage[]> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("patient_id", patientId)
      .order("paid_at", { ascending: false });

    if (error) return [];

    return (data || []).map((o: any) => {
      const paidRaw = o.paid_at ?? o.created_at ?? "";
      const refundedRaw = o.refunded_at ?? "";

      let paymentStatus = normalizePaymentStatus(o.payment_status);
      if (o.status === "pending_confirmation") {
        paymentStatus = "pending" as PaymentStatus;
      }

      return {
        id: String(o.id ?? ""),
        productCode: String(o.product_code ?? ""),
        productName: String(o.product_name ?? ""),
        amount: Number(o.amount) || 0,
        paidAt: toIsoFlexible(paidRaw),
        shippingStatus: ((o.shipping_status || "pending") as ShippingStatus),
        shippingEta: o.shipping_date ?? undefined,
        trackingNumber: o.tracking_number ?? undefined,
        paymentStatus,
        paymentMethod: (o.payment_method === "bank_transfer" ? "bank_transfer" : "credit_card") as "credit_card" | "bank_transfer",
        refundStatus: normalizeRefundStatus(o.refund_status),
        refundedAt: toIsoFlexible(refundedRaw) || undefined,
        refundedAmount: toNumberOrUndefined(o.refunded_amount),
      };
    });
  } catch {
    return [];
  }
}

async function getReordersFromSupabase(patientId: string): Promise<{
  id: string;
  status: string;
  createdAt: string;
  productCode: string;
  mg: string;
  months: number | undefined;
}[]> {
  try {
    const { data, error } = await supabase
      .from("reorders")
      .select("id, status, created_at, product_code")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) return [];

    return (data || []).map((r: any) => {
      const productCode = String(r.product_code || "");
      const mgMatch = productCode.match(/(\d+\.?\d*mg)/);
      const monthsMatch = productCode.match(/(\d+)m$/);

      return {
        id: String(r.id),
        status: String(r.status || ""),
        createdAt: r.created_at || "",
        productCode,
        mg: mgMatch ? mgMatch[1] : "",
        months: monthsMatch ? Number(monthsMatch[1]) : undefined,
      };
    });
  } catch {
    return [];
  }
}

// ─── メインAPI ───

/**
 * 管理者用：患者のマイページデータを確認
 * GET /api/admin/view-mypage?patient_id=20251200128
 */
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patient_id");

    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "patient_id query parameter required" },
        { status: 400 }
      );
    }

    // ★ 全クエリをPromise.allで並列実行（GAS呼び出し廃止）
    const [patientInfo, nextReservation, orders, history, reorders] = await Promise.all([
      getPatientInfoFromSupabase(patientId),
      getNextReservationFromSupabase(patientId),
      getOrdersFromSupabase(patientId),
      getConsultationHistoryFromSupabase(patientId),
      getReordersFromSupabase(patientId),
    ]);

    const activeOrders = orders.filter((o) => o.refundStatus !== "COMPLETED");
    const isNG = patientInfo.intakeStatus === "NG";
    const hasAnyPaidOrder = orders.length > 0;
    const flags = {
      canPurchaseCurrentCourse: !hasAnyPaidOrder && !isNG,
      canApplyReorder: hasAnyPaidOrder && !isNG,
      hasAnyPaidOrder,
    };

    const responseData = {
      patient: {
        id: patientInfo.id,
        displayName: patientInfo.displayName,
      },
      nextReservation,
      activeOrders,
      history,
      hasMoreHistory: false,
      orders,
      flags,
      ordersFlags: flags,
      reorders,
      hasIntake: patientInfo.hasIntake,
      intakeStatus: patientInfo.intakeStatus,
    };

    return NextResponse.json(
      { ok: true, source: "supabase", patientId, data: responseData },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/admin/view-mypage error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
