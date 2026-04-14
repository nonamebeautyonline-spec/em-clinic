import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

// RPC結果の型定義
interface RpcResult {
  reservations: {
    total: number;
    completed: number;
    cancelled: number;
    cancelRate: number;
    consultationCompletionRate: number;
  };
  shipping: {
    total: number;
    first: number;
    reorder: number;
  };
  revenue: {
    square: number;
    bankTransfer: number;
    gross: number;
    refunded: number;
    refundCount: number;
    total: number;
    avgOrderAmount: number;
    totalOrders: number;
    reorderOrders: number;
  };
  products: { code: string; name: string; count: number; revenue: number }[];
  patients: {
    total: number;
    active: number;
    new: number;
    repeatRate: number;
    repeatPatients: number;
    totalOrderPatients: number;
    prevPeriodPatients: number;
  };
  bankTransfer: {
    pending: number;
    confirmed: number;
  };
  kpi: {
    paymentRateAfterConsultation: number;
    reservationRateAfterIntake: number;
    consultationCompletionRate: number;
    lineRegisteredCount: number;
    todayActiveReservations: number;
    todayActiveOK: number;
    todayActiveNG: number;
    todayNoAnswer: number;
    todayNewReservations: number;
    todayPaidCount: number;
  };
  // 日別集計用の生データ（RPC関数から返される）
  squareOrders: { amount: number; patient_id: string; product_code: string; paid_at: string }[];
  btOrders: { amount: number; patient_id: string; product_code: string; created_at: string }[];
  prevPaidPatientIds: string[];
}

export async function GET(request: NextRequest) {
  try {
    // 管理者認証
    const isAuthorized = await verifyAdminAuth(request);
    if (!isAuthorized) {
      return unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get("range") || "today";
    const customStart = searchParams.get("start");
    const customEnd = searchParams.get("end");

    const tenantId = resolveTenantIdOrThrow(request);

    // 日付範囲を計算
    const { startISO, endISO, startDate: reservationStartDate, endDate: reservationEndDate, prevStartISO, prevEndISO } = calculateDateRange(range, customStart, customEnd);

    // 配送日付の計算（JST基準）
    const startDateObj = new Date(startISO);
    const endDateObj = new Date(endISO);
    const jstOffset = 9 * 60 * 60 * 1000;
    const shippingStartDate = new Date(startDateObj.getTime() + jstOffset).toISOString().split("T")[0];
    const shippingEndDate = new Date(endDateObj.getTime() + jstOffset).toISOString().split("T")[0];

    // ────────────────────────────────────────────────────────────
    // RPC関数で全クエリを一括実行
    // ────────────────────────────────────────────────────────────
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("dashboard_enhanced_stats", {
      p_tenant_id: tenantId,
      p_start_iso: startISO,
      p_end_iso: endISO,
      p_prev_start_iso: prevStartISO,
      p_prev_end_iso: prevEndISO,
      p_reservation_start_date: reservationStartDate,
      p_reservation_end_date: reservationEndDate,
      p_shipping_start_date: shippingStartDate,
      p_shipping_end_date: shippingEndDate,
    });

    if (rpcError) {
      console.error("[dashboard-stats-enhanced] RPC error:", rpcError);
      return serverError(rpcError.message);
    }

    const stats = rpcData as RpcResult;

    // ────────────────────────────────────────────────────────────
    // クライアントサイド集計（メモリ内計算、DBアクセスなし）
    // ────────────────────────────────────────────────────────────

    // 商品名マッピング（RPC関数はproduct_codeをnameに入れるため上書き）
    const productNames: Record<string, string> = {
      "MJL_2.5mg_1m": "マンジャロ 2.5mg 1ヶ月",
      "MJL_2.5mg_2m": "マンジャロ 2.5mg 2ヶ月",
      "MJL_2.5mg_3m": "マンジャロ 2.5mg 3ヶ月",
      "MJL_5mg_1m": "マンジャロ 5mg 1ヶ月",
      "MJL_5mg_2m": "マンジャロ 5mg 2ヶ月",
      "MJL_5mg_3m": "マンジャロ 5mg 3ヶ月",
      "MJL_7.5mg_1m": "マンジャロ 7.5mg 1ヶ月",
      "MJL_7.5mg_2m": "マンジャロ 7.5mg 2ヶ月",
      "MJL_7.5mg_3m": "マンジャロ 7.5mg 3ヶ月",
    };
    const products = (stats.products || []).map(p => ({
      ...p,
      name: productNames[p.code] || p.code,
    }));

    // 日別集計（RPC関数から返された生注文データを使用）
    const allSquareOrders = stats.squareOrders || [];
    const allBankTransferOrders = stats.btOrders || [];
    const prevPaidPatientIds = new Set(stats.prevPaidPatientIds || []);

    const jstOffsetMs = 9 * 60 * 60 * 1000;
    const dailyMap = new Map<string, { first: number; reorder: number; square: number; bankTransfer: number; firstOrders: number; reorders: number }>();
    const ensureDay = (dateStr: string) => {
      if (!dailyMap.has(dateStr)) dailyMap.set(dateStr, { first: 0, reorder: 0, square: 0, bankTransfer: 0, firstOrders: 0, reorders: 0 });
      return dailyMap.get(dateStr)!;
    };
    for (const order of allSquareOrders) {
      const dateStr = order.paid_at
        ? new Date(new Date(order.paid_at).getTime() + jstOffsetMs).toISOString().split("T")[0]
        : null;
      if (!dateStr) continue;
      const day = ensureDay(dateStr);
      day.square += order.amount || 0;
      if (!order.patient_id) continue;
      if (prevPaidPatientIds.has(order.patient_id)) {
        day.reorder++;
        day.reorders++;
      } else {
        day.first++;
        day.firstOrders++;
      }
    }
    for (const order of allBankTransferOrders) {
      const dateStr = order.created_at
        ? new Date(new Date(order.created_at).getTime() + jstOffsetMs).toISOString().split("T")[0]
        : null;
      if (!dateStr) continue;
      const day = ensureDay(dateStr);
      day.bankTransfer += order.amount || 0;
      if (!order.patient_id) continue;
      if (prevPaidPatientIds.has(order.patient_id)) {
        day.reorder++;
        day.reorders++;
      } else {
        day.first++;
        day.firstOrders++;
      }
    }
    const dailyEntries = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const dailyOrders = dailyEntries.map(([date, counts]) => ({ date, first: counts.first, reorder: counts.reorder }));
    const dailyBreakdown = dailyEntries.map(([date, counts]) => ({
      date,
      square: counts.square,
      bankTransfer: counts.bankTransfer,
      firstOrders: counts.firstOrders,
      reorders: counts.reorders,
    }));

    return NextResponse.json({
      reservations: stats.reservations,
      shipping: stats.shipping,
      revenue: stats.revenue,
      products,
      patients: stats.patients,
      bankTransfer: stats.bankTransfer,
      kpi: stats.kpi,
      dailyOrders,
      dailyBreakdown,
    });
  } catch (error) {
    console.error("[dashboard-stats-enhanced] Error:", error);
    return serverError(error instanceof Error ? error.message : "Internal server error");
  }
}

function calculateDateRange(
  range: string,
  customStart: string | null,
  customEnd: string | null
): { startISO: string; endISO: string; startDate: string; endDate: string; prevStartISO: string; prevEndISO: string } {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNowMs = now.getTime() + jstOffset;
  const jstNow = new Date(jstNowMs);

  // JSTの日付部分を取得
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();
  const date = jstNow.getUTCDate();

  let start: Date;
  let end: Date;
  let prevStart: Date;

  switch (range) {
    case "yesterday":
      start = new Date(Date.UTC(year, month, date - 1, 0, 0, 0) - jstOffset);
      end = new Date(Date.UTC(year, month, date, 0, 0, 0) - jstOffset);
      prevStart = new Date(Date.UTC(year, month, date - 2, 0, 0, 0) - jstOffset);
      break;

    case "this_week": {
      const dayOfWeek = jstNow.getUTCDay();
      start = new Date(Date.UTC(year, month, date - dayOfWeek, 0, 0, 0) - jstOffset);
      end = new Date(Date.UTC(year, month, date + 1, 0, 0, 0) - jstOffset);
      prevStart = new Date(Date.UTC(year, month, date - dayOfWeek - 7, 0, 0, 0) - jstOffset);
      break;
    }

    case "last_week": {
      const lastWeekDay = jstNow.getUTCDay();
      start = new Date(Date.UTC(year, month, date - lastWeekDay - 7, 0, 0, 0) - jstOffset);
      end = new Date(Date.UTC(year, month, date - lastWeekDay, 0, 0, 0) - jstOffset);
      prevStart = new Date(Date.UTC(year, month, date - lastWeekDay - 14, 0, 0, 0) - jstOffset);
      break;
    }

    case "this_month":
      start = new Date(Date.UTC(year, month, 1, 0, 0, 0) - jstOffset);
      end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0) - jstOffset);
      prevStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - jstOffset);
      break;

    case "last_month":
      start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - jstOffset);
      end = new Date(Date.UTC(year, month, 1, 0, 0, 0) - jstOffset);
      prevStart = new Date(Date.UTC(year, month - 2, 1, 0, 0, 0) - jstOffset);
      break;

    case "custom":
      if (customStart && customEnd) {
        const [sy, sm, sd] = customStart.split("-").map(Number);
        const [ey, em, ed] = customEnd.split("-").map(Number);
        start = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0) - jstOffset);
        end = new Date(Date.UTC(ey, em - 1, ed + 1, 0, 0, 0) - jstOffset);
        const duration = end.getTime() - start.getTime();
        prevStart = new Date(start.getTime() - duration);
      } else {
        start = new Date(Date.UTC(year, month, date, 0, 0, 0) - jstOffset);
        end = new Date(Date.UTC(year, month, date + 1, 0, 0, 0) - jstOffset);
        prevStart = new Date(Date.UTC(year, month, date - 1, 0, 0, 0) - jstOffset);
      }
      break;

    case "today":
    default:
      start = new Date(Date.UTC(year, month, date, 0, 0, 0) - jstOffset);
      end = new Date(Date.UTC(year, month, date + 1, 0, 0, 0) - jstOffset);
      prevStart = new Date(Date.UTC(year, month, date - 1, 0, 0, 0) - jstOffset);
      break;
  }

  const jstStartForDate = new Date(start.getTime() + jstOffset);
  const jstEndForDate = new Date(end.getTime() + jstOffset);
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    startDate: jstStartForDate.toISOString().split("T")[0],
    endDate: jstEndForDate.toISOString().split("T")[0],
    prevStartISO: prevStart.toISOString(),
    prevEndISO: start.toISOString(), // 前期間の終了 = 当期間の開始
  };
}
