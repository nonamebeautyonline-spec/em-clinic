// app/api/admin/view-mypage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

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

/**
 * Supabaseから次回予約情報を取得
 */
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
      // ★ 診察完了(OK/NG)とキャンセルを除外 - 未診察の予約のみ取得
      .or("status.is.null,status.eq.")
      .order("reserved_date", { ascending: true })
      .order("reserved_time", { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      console.log(`[admin/view-mypage] No reservation found for patient_id=${patientId}`);
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
    console.error("[admin/view-mypage] getNextReservation error:", err);
    return null;
  }
}

type ConsultationHistory = {
  id: string;
  date: string;
  title: string;
  detail: string;
};

/**
 * Supabaseから診察履歴を取得（status=OK/NGの診察完了分）
 */
async function getConsultationHistoryFromSupabase(
  patientId: string
): Promise<ConsultationHistory[]> {
  try {
    const { data, error } = await supabase
      .from("intake")
      .select("reserve_id, reserved_date, reserved_time, status, note, prescription_menu, updated_at")
      .eq("patient_id", patientId)
      .in("status", ["OK", "NG"])
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[admin/view-mypage] getConsultationHistory error:", error);
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
      };
    });
  } catch (err) {
    console.error("[admin/view-mypage] getConsultationHistory error:", err);
    return [];
  }
}

/**
 * Supabaseから再処方申請を取得（顧客マイページと同じロジック）
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
    const { data, error } = await supabase
      .from("reorders")
      .select("id, status, created_at, product_code")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/view-mypage] getReorders error:", error);
      return [];
    }

    return (data || []).map((r: any) => {
      // product_code から mg と months を抽出（例: "MJL_2.5mg_3m" → mg="2.5mg", months=3）
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
  } catch (err) {
    console.error("[admin/view-mypage] getReorders error:", err);
    return [];
  }
}

/**
 * 管理者用：患者のマイページデータを確認
 * GET /api/admin/view-mypage?patient_id=20251200128
 * Authorization: Bearer <ADMIN_TOKEN>
 */
export async function GET(req: NextRequest) {
  try {
    // ★ ADMIN_TOKEN チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // ★ patient_id を取得
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patient_id");

    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "patient_id query parameter required" },
        { status: 400 }
      );
    }

    // ★ GASから基本情報を取得（患者情報、予約、診察履歴など）
    let gasData: any = {};

    if (GAS_MYPAGE_URL) {
      try {
        const dashboardUrl = `${GAS_MYPAGE_URL}?type=getDashboard&patient_id=${encodeURIComponent(patientId)}`;
        const gasRes = await fetch(dashboardUrl, {
          method: "GET",
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        });

        if (gasRes.ok) {
          const gasText = await gasRes.text().catch(() => "");
          try {
            gasData = JSON.parse(gasText);
          } catch {
            console.error(`[Admin] GAS JSON parse error for patient ${patientId}`);
          }
        } else {
          console.error(`[Admin] GAS error for patient ${patientId}:`, gasRes.status);
        }
      } catch (err) {
        console.error(`[Admin] GAS fetch error:`, err);
      }
    }

    // ★ Supabaseから注文データを取得（患者マイページと同じロジック）
    const { data: rawOrders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("patient_id", patientId)
      .order("paid_at", { ascending: false });

    if (error) {
      console.error("[admin/view-mypage] Supabase query error:", error);
      return NextResponse.json({ ok: false, error: "database_error" }, { status: 500 });
    }

    // ★ 銀行振込の注文も取得
    const { data: rawBankTransferOrders, error: bankTransferError } = await supabase
      .from("bank_transfer_orders")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (bankTransferError) {
      console.error("[admin/view-mypage] Bank transfer query error:", bankTransferError);
    }

    const orders: OrderForMyPage[] = rawOrders.map((o: any) => {
      const paidRaw =
        o.paid_at_jst ??
        o.paidAt ??
        o.paid_at ??
        o.order_datetime ??
        o.orderDateTime ??
        o.created_at ??  // 銀行振込で未確認の場合のフォールバック
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

    // ★ ordersテーブルに存在するbt_*のIDを取得（追跡番号の有無に関わらず）
    const existingBtIds = new Set(
      orders
        .filter(o => o.id.startsWith("bt_"))
        .map(o => o.id.replace("bt_", ""))
    );

    // ★ 銀行振込注文のcreated_atを記録（タイムスタンプ重複排除用）
    const bankTransferOrdersInOrders = orders.filter(o => o.paymentMethod === "bank_transfer");

    // ★ 銀行振込の注文を統合（顧客マイページと同じ重複排除ロジック）
    if (rawBankTransferOrders && rawBankTransferOrders.length > 0) {
      const bankTransferOrders: OrderForMyPage[] = rawBankTransferOrders
        .filter((o: any) => {
          // IDで紐付け可能な場合はIDで除外
          if (existingBtIds.has(String(o.id))) {
            return false;
          }

          // IDで紐付けできない場合は、タイムスタンプ＋商品コードでマッチング
          const btCreatedAt = new Date(o.created_at).getTime();
          const btProductCode = String(o.product_code ?? "");

          const foundMatch = bankTransferOrdersInOrders.some(orderRecord => {
            const orderPaidAt = new Date(orderRecord.paidAt || "").getTime();
            const timeDiff = Math.abs(btCreatedAt - orderPaidAt);

            if (timeDiff < 60000) {
              // 商品コードも一致する場合は同一レコード
              if (btProductCode === orderRecord.productCode) {
                return true;
              }
              // 商品コードが異なる場合は1秒以内のみ同一とみなす
              if (timeDiff < 1000) {
                return true;
              }
            }
            return false;
          });

          return !foundMatch;
        })
        .map((o: any) => {
          const productCode = String(o.product_code ?? "");
          const productInfo = PRODUCTS[productCode] || { name: "商品名不明", price: 0 };

          return {
            id: `bank_${o.id}`,
            productCode,
            productName: productInfo.name,
            amount: productInfo.price,
            paidAt: toIsoFlexible(o.confirmed_at ?? o.created_at ?? ""),
            shippingStatus: "pending",
            paymentStatus: "pending",
            paymentMethod: "bank_transfer",
          };
        });

      orders.push(...bankTransferOrders);

      // ★ 日付でソート（新しい順）
      orders.sort((a, b) => {
        const dateA = new Date(a.paidAt).getTime();
        const dateB = new Date(b.paidAt).getTime();
        return dateB - dateA;
      });
    }

    // ★ Flags computed from Supabase orders data（顧客マイページと同じロジック）
    const hasAnyPaidOrder = orders.length > 0;
    const flags = {
      canPurchaseCurrentCourse: !hasAnyPaidOrder,  // 注文がない場合のみ購入可
      canApplyReorder: hasAnyPaidOrder,            // 注文がある場合のみ再処方可
      hasAnyPaidOrder,
    };

    // ★ activeOrders を Supabase orders から計算（顧客マイページと同じロジック）
    const activeOrders = orders.filter((o) => o.refundStatus !== "COMPLETED");

    // ★ Supabaseから次回予約を取得（GASではなく）
    const nextReservation = await getNextReservationFromSupabase(patientId);

    // ★ Supabaseから診察履歴を取得（GASではなく）
    const historyFromDB = await getConsultationHistoryFromSupabase(patientId);

    // ★ Supabaseから再処方申請を取得（GASではなく、顧客マイページと同じ）
    const reordersFromDB = await getReordersFromSupabase(patientId);

    // ★ GASデータとSupabaseデータをマージ
    const responseData = {
      patient: gasData.patient || null,
      nextReservation, // ★ Supabaseから取得
      activeOrders, // ★ Supabaseから計算（顧客マイページと同じ）
      history: historyFromDB, // ★ Supabaseから取得
      hasMoreHistory: gasData.hasMoreHistory || false,
      orders, // ★ Supabaseから取得した注文データ
      flags, // ★ Supabaseから計算したフラグ
      ordersFlags: flags, // ★ 互換性のため
      reorders: reordersFromDB, // ★ Supabaseから取得（顧客マイページと同じ）
      hasIntake: gasData.hasIntake || false,
      perf: gasData.perf || [],
    };

    return NextResponse.json(
      {
        ok: true,
        source: "supabase",
        patientId,
        data: responseData,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/admin/view-mypage error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
