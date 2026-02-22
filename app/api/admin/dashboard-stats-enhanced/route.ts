import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { jwtVerify } from "jose";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

// 管理者認証チェック（クッキーまたはBearerトークン）
async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  // 1. クッキーベースのセッション認証（新方式）
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(sessionCookie, secret);
      return true;
    } catch {
      // クッキー無効、次の方式を試す
    }
  }

  // 2. Bearerトークン認証（後方互換性）
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === process.env.ADMIN_TOKEN) {
      return true;
    }
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    // 管理者認証
    const isAuthorized = await verifyAdminAuth(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get("range") || "today";
    const customStart = searchParams.get("start");
    const customEnd = searchParams.get("end");

    const tenantId = resolveTenantId(request);

    // 日付範囲を計算
    const { startISO, endISO, startDate: reservationStartDate, endDate: reservationEndDate } = calculateDateRange(range, customStart, customEnd);

    // 配送日付の計算（JST基準）
    const startDateObj = new Date(startISO);
    const endDateObj = new Date(endISO);
    const jstOffset = 9 * 60 * 60 * 1000;
    const shippingStartDate = new Date(startDateObj.getTime() + jstOffset).toISOString().split("T")[0];
    const shippingEndDate = new Date(endDateObj.getTime() + jstOffset).toISOString().split("T")[0];

    // ────────────────────────────────────────────────────────────
    // バッチ1: 独立した全クエリを並列実行（逐次→並列で大幅高速化）
    // ────────────────────────────────────────────────────────────
    const [
      totalReservationsResult,
      completedOKResult,
      completedNGResult,
      cancelledResult,
      shippingTotalResult,
      shippingOrdersResult,
      squareOrdersResult,
      bankTransferResult,
      refundedResult,
      totalPatientsResult,
      pendingBTResult,
      confirmedBTResult,
      consultedIdsResult,
      intakeIdsResult,
      lineIdResult,
      todayActiveResult,
      todayNewReservationsResult,
    ] = await Promise.all([
      // 1. 予約総数
      withTenant(
        supabaseAdmin.from("reservations").select("*", { count: "exact", head: true })
          .gte("reserved_date", reservationStartDate).lt("reserved_date", reservationEndDate),
        tenantId
      ),
      // 2. 診察完了（OK）
      withTenant(
        supabaseAdmin.from("reservations").select("patient_id")
          .gte("reserved_date", reservationStartDate).lt("reserved_date", reservationEndDate)
          .eq("status", "OK").limit(10000),
        tenantId
      ),
      // 3. 診察完了（NG）
      withTenant(
        supabaseAdmin.from("reservations").select("patient_id")
          .gte("reserved_date", reservationStartDate).lt("reserved_date", reservationEndDate)
          .eq("status", "NG").limit(10000),
        tenantId
      ),
      // 4. キャンセル数
      withTenant(
        supabaseAdmin.from("reservations").select("*", { count: "exact", head: true })
          .gte("reserved_date", reservationStartDate).lt("reserved_date", reservationEndDate)
          .eq("status", "canceled"),
        tenantId
      ),
      // 5. 配送総数
      withTenant(
        supabaseAdmin.from("orders").select("*", { count: "exact", head: true })
          .gte("shipping_date", shippingStartDate).lt("shipping_date", shippingEndDate),
        tenantId
      ),
      // 6. 配送注文データ
      withTenant(
        supabaseAdmin.from("orders").select("patient_id, created_at")
          .gte("shipping_date", shippingStartDate).lt("shipping_date", shippingEndDate)
          .limit(10000),
        tenantId
      ),
      // 7. カード決済注文
      withTenant(
        supabaseAdmin.from("orders").select("amount, patient_id, created_at, paid_at, product_code")
          .eq("payment_method", "credit_card")
          .gte("paid_at", startISO).lt("paid_at", endISO)
          .limit(10000),
        tenantId
      ),
      // 8. 銀行振込注文
      withTenant(
        supabaseAdmin.from("orders").select("amount, product_code, patient_id, created_at")
          .eq("payment_method", "bank_transfer")
          .in("status", ["pending_confirmation", "confirmed"])
          .gte("created_at", startISO).lt("created_at", endISO)
          .limit(10000),
        tenantId
      ),
      // 9. 返金データ
      withTenant(
        supabaseAdmin.from("orders").select("amount, refunded_amount")
          .eq("refund_status", "COMPLETED")
          .gte("refunded_at", startISO).lt("refunded_at", endISO)
          .limit(10000),
        tenantId
      ),
      // 10. 総患者数
      withTenant(
        supabaseAdmin.from("intake").select("*", { count: "exact", head: true }),
        tenantId
      ),
      // 11. 銀行振込（入金待ち）
      withTenant(
        supabaseAdmin.from("orders").select("*", { count: "exact", head: true })
          .eq("payment_method", "bank_transfer").eq("status", "pending_confirmation")
          .gte("created_at", startISO).lt("created_at", endISO),
        tenantId
      ),
      // 12. 銀行振込（確認済み）
      withTenant(
        supabaseAdmin.from("orders").select("*", { count: "exact", head: true })
          .eq("payment_method", "bank_transfer").eq("status", "confirmed")
          .gte("created_at", startISO).lt("created_at", endISO),
        tenantId
      ),
      // 13. 診察完了患者ID（KPI用）
      withTenant(
        supabaseAdmin.from("intake").select("patient_id")
          .in("status", ["OK", "NG"])
          .gte("created_at", startISO).lt("created_at", endISO)
          .limit(10000),
        tenantId
      ),
      // 14. 問診患者ID（KPI用 + 新規患者数兼用）
      withTenant(
        supabaseAdmin.from("intake").select("patient_id")
          .gte("created_at", startISO).lt("created_at", endISO)
          .limit(10000),
        tenantId
      ),
      // 15. LINE登録者
      withTenant(
        supabaseAdmin.from("patients").select("line_id")
          .not("line_id", "is", null)
          .limit(100000),
        tenantId
      ),
      // 16. アクティブ予約数
      withTenant(
        supabaseAdmin.from("reservations").select("*", { count: "exact", head: true })
          .gte("reserved_date", reservationStartDate).lt("reserved_date", reservationEndDate)
          .neq("status", "canceled"),
        tenantId
      ),
      // 17. 本日作成予約数
      withTenant(
        supabaseAdmin.from("reservations").select("*", { count: "exact", head: true })
          .gte("created_at", startISO).lt("created_at", endISO),
        tenantId
      ),
    ]);

    // バッチ1の結果を展開
    const totalReservations = totalReservationsResult.count ?? 0;
    const cancelledReservations = cancelledResult.count ?? 0;
    const shippingTotal = shippingTotalResult.count ?? 0;
    const totalPatients = totalPatientsResult.count ?? 0;
    const pendingBankTransfer = pendingBTResult.count ?? 0;
    const confirmedBankTransfer = confirmedBTResult.count ?? 0;
    const todayActiveReservations = todayActiveResult.count ?? 0;
    const todayNewReservations = todayNewReservationsResult.count ?? 0;

    const allSquareOrders = squareOrdersResult.data || [];
    const allBankTransferOrders = bankTransferResult.data || [];
    const allRefundedOrders = refundedResult.data || [];
    const shippingOrders = shippingOrdersResult.data || [];

    // 診察完了患者数
    const allCompletedPatientIds = [
      ...(completedOKResult.data?.map((r: any) => r.patient_id) || []),
      ...(completedNGResult.data?.map((r: any) => r.patient_id) || []),
    ];
    const completedReservations = new Set(allCompletedPatientIds.filter((id: any) => id)).size;

    const cancelRate = totalReservations > 0
      ? Math.round((cancelledReservations / totalReservations) * 100) : 0;

    // 新規患者数 = intakeIdsResult のレコード数（重複クエリ排除）
    const newPatients = intakeIdsResult.data?.length ?? 0;

    // LINE登録者数
    const lineRegisteredCount = new Set(lineIdResult.data?.map((r: any) => r.line_id) || []).size;

    // 売上集計
    const squareRevenue = allSquareOrders.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
    const bankTransferRevenue = allBankTransferOrders.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
    const grossRevenue = squareRevenue + bankTransferRevenue;
    const orderCount = allSquareOrders.length + allBankTransferOrders.length;
    const totalRefunded = allRefundedOrders.reduce((sum: number, o: any) => sum + (o.refunded_amount ?? o.amount ?? 0), 0);
    const totalRevenue = grossRevenue - totalRefunded;
    const avgOrderAmount = orderCount > 0 ? Math.round(grossRevenue / orderCount) : 0;

    // 全決済注文の結合
    const allPaidOrders = [
      ...allSquareOrders.map((o: any) => ({ patient_id: o.patient_id || null, created_at: o.created_at || null, paid_at: o.paid_at || null })),
      ...allBankTransferOrders.map((o: any) => ({ patient_id: o.patient_id || null, created_at: o.created_at || null, paid_at: null as string | null })),
    ];

    // ────────────────────────────────────────────────────────────
    // バッチ2: バッチ1の結果に依存するクエリを並列実行
    // ────────────────────────────────────────────────────────────
    const shippingPatientIds = [...new Set(shippingOrders.map((o: any) => o.patient_id).filter((id: any) => id))];
    const paidPatientIds = [...new Set(allPaidOrders.map(o => o.patient_id).filter((id): id is string => !!id))];
    const consultedPatientIds = [...new Set((consultedIdsResult.data || []).map((i: any) => i.patient_id).filter((id: any) => id))];
    const intakePatientIds = [...new Set((intakeIdsResult.data || []).map((i: any) => i.patient_id).filter((id: any) => id))];

    const [
      prevShippingResult,
      prevPaidResult,
      paidForConsultedResult,
      reservedForIntakeResult,
    ] = await Promise.all([
      // 配送: 過去に注文がある患者を特定
      shippingPatientIds.length > 0
        ? withTenant(
            supabaseAdmin.from("orders").select("patient_id")
              .in("patient_id", shippingPatientIds).lt("created_at", startISO).limit(100000),
            tenantId
          )
        : Promise.resolve({ data: [] }),
      // 決済: 過去に注文がある患者を特定（リピート率計算用）
      paidPatientIds.length > 0
        ? withTenant(
            supabaseAdmin.from("orders").select("patient_id")
              .in("patient_id", paidPatientIds).lt("created_at", startISO).limit(100000),
            tenantId
          )
        : Promise.resolve({ data: [] }),
      // KPI: 診察完了患者のうち決済した患者
      consultedPatientIds.length > 0
        ? withTenant(
            supabaseAdmin.from("orders").select("patient_id")
              .in("patient_id", consultedPatientIds)
              .not("paid_at", "is", null)
              .gte("paid_at", startISO).lt("paid_at", endISO).limit(100000),
            tenantId
          )
        : Promise.resolve({ data: [] }),
      // KPI: 問診患者のうち予約した患者
      intakePatientIds.length > 0
        ? withTenant(
            supabaseAdmin.from("reservations").select("patient_id")
              .in("patient_id", intakePatientIds)
              .gte("reserved_date", reservationStartDate).lt("reserved_date", reservationEndDate).limit(100000),
            tenantId
          )
        : Promise.resolve({ data: [] }),
    ]);

    // 配送: 新規/再処方の判定
    let shippingFirst = 0;
    let shippingReorder = 0;
    if (shippingOrders.length > 0) {
      const prevShippingSet = new Set((prevShippingResult.data || []).map((o: any) => o.patient_id));
      for (const order of shippingOrders) {
        if (prevShippingSet.has(order.patient_id)) shippingReorder++;
        else shippingFirst++;
      }
    }

    // リピート率・再処方決済数
    let reorderOrderCount = 0;
    let repeatPatientCount = 0;
    const totalUniquePatients = paidPatientIds.length;
    const previousPatientSet = new Set((prevPaidResult.data || []).map((o: any) => o.patient_id));

    if (totalUniquePatients > 0) {
      repeatPatientCount = paidPatientIds.filter(id => previousPatientSet.has(id)).length;
      for (const order of allPaidOrders) {
        if (order.patient_id && previousPatientSet.has(order.patient_id)) reorderOrderCount++;
      }
    }

    const repeatRate = totalUniquePatients > 0
      ? Math.round((repeatPatientCount / totalUniquePatients) * 100) : 0;

    // アクティブ患者
    const activePatients = new Set(allPaidOrders.map(o => o.patient_id).filter(id => id)).size;

    // KPI: 診療後の決済率
    const paidPatientCount = new Set((paidForConsultedResult.data || []).map((o: any) => o.patient_id)).size;
    const consultedCount = consultedPatientIds.length;
    const paymentRateAfterConsultation = consultedCount > 0
      ? Math.round((paidPatientCount / consultedCount) * 100) : 0;

    // KPI: 問診後の予約率
    const reservedPatientCount = new Set((reservedForIntakeResult.data || []).map((r: any) => r.patient_id)).size;
    const intakeCount = intakePatientIds.length;
    const reservationRateAfterIntake = intakeCount > 0
      ? Math.round((reservedPatientCount / intakeCount) * 100) : 0;

    // KPI: 予約後の受診率
    const nonCancelledReservations = totalReservations - cancelledReservations;
    const consultationCompletionRate = nonCancelledReservations > 0
      ? Math.round((completedReservations / nonCancelledReservations) * 100) : 0;

    // 今日決済した人数
    const todayPaidCount = new Set(allPaidOrders.map(o => o.patient_id).filter(id => id)).size;

    // ────────────────────────────────────────────────────────────
    // クライアントサイド集計（メモリ内計算、DBアクセスなし）
    // ────────────────────────────────────────────────────────────
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

    const productSales: Record<string, { code: string; name: string; count: number; revenue: number }> = {};
    for (const order of [...allSquareOrders, ...allBankTransferOrders]) {
      const code = order.product_code;
      if (!productSales[code]) {
        productSales[code] = { code, name: productNames[code] || code, count: 0, revenue: 0 };
      }
      productSales[code].count++;
      productSales[code].revenue += order.amount || 0;
    }
    const products = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);

    // 日別新規/再処方データ + 日別売上内訳（dailyBreakdown）
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
      if (order.patient_id && previousPatientSet.has(order.patient_id)) {
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
      if (order.patient_id && previousPatientSet.has(order.patient_id)) {
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
      reservations: {
        total: totalReservations,
        completed: completedReservations,
        cancelled: cancelledReservations,
        cancelRate,
        consultationCompletionRate,
      },
      shipping: {
        total: shippingTotal,
        first: shippingFirst,
        reorder: shippingReorder,
      },
      revenue: {
        square: squareRevenue,
        bankTransfer: bankTransferRevenue,
        gross: grossRevenue,
        refunded: totalRefunded,
        refundCount: allRefundedOrders.length,
        total: totalRevenue,
        avgOrderAmount,
        totalOrders: orderCount,
        reorderOrders: reorderOrderCount,
      },
      products,
      patients: {
        total: totalPatients,
        active: activePatients,
        new: newPatients,
        repeatRate,
        repeatPatients: repeatPatientCount,
        totalOrderPatients: totalUniquePatients,
      },
      bankTransfer: {
        pending: pendingBankTransfer,
        confirmed: confirmedBankTransfer,
      },
      kpi: {
        paymentRateAfterConsultation,
        reservationRateAfterIntake,
        consultationCompletionRate,
        lineRegisteredCount,
        todayActiveReservations,
        todayNewReservations,
        todayPaidCount,
      },
      dailyOrders,
      dailyBreakdown,
    });
  } catch (error) {
    console.error("[dashboard-stats-enhanced] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

function calculateDateRange(
  range: string,
  customStart: string | null,
  customEnd: string | null
): { startISO: string; endISO: string; startDate: string; endDate: string } {
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

  switch (range) {
    case "yesterday":
      // 昨日0:00 JST = UTC - 9時間
      start = new Date(Date.UTC(year, month, date - 1, 0, 0, 0) - jstOffset);
      end = new Date(Date.UTC(year, month, date, 0, 0, 0) - jstOffset);
      break;

    case "this_week":
      const dayOfWeek = jstNow.getUTCDay();
      start = new Date(Date.UTC(year, month, date - dayOfWeek, 0, 0, 0) - jstOffset);
      end = new Date(Date.UTC(year, month, date + 1, 0, 0, 0) - jstOffset);
      break;

    case "last_week":
      const lastWeekDay = jstNow.getUTCDay();
      start = new Date(Date.UTC(year, month, date - lastWeekDay - 7, 0, 0, 0) - jstOffset);
      end = new Date(Date.UTC(year, month, date - lastWeekDay, 0, 0, 0) - jstOffset);
      break;

    case "this_month":
      start = new Date(Date.UTC(year, month, 1, 0, 0, 0) - jstOffset);
      end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0) - jstOffset);
      break;

    case "last_month":
      start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - jstOffset);
      end = new Date(Date.UTC(year, month, 1, 0, 0, 0) - jstOffset);
      break;

    case "custom":
      if (customStart && customEnd) {
        // カスタム範囲は JST で指定されると仮定
        const [sy, sm, sd] = customStart.split("-").map(Number);
        const [ey, em, ed] = customEnd.split("-").map(Number);
        start = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0) - jstOffset);
        end = new Date(Date.UTC(ey, em - 1, ed + 1, 0, 0, 0) - jstOffset); // 終了日を含める
      } else {
        // デフォルトは今日
        start = new Date(Date.UTC(year, month, date, 0, 0, 0) - jstOffset);
        end = new Date(Date.UTC(year, month, date + 1, 0, 0, 0) - jstOffset);
      }
      break;

    case "today":
    default:
      // 今日0:00 JST = UTC - 9時間
      start = new Date(Date.UTC(year, month, date, 0, 0, 0) - jstOffset);
      end = new Date(Date.UTC(year, month, date + 1, 0, 0, 0) - jstOffset);
      break;
  }

  // reserved_date はJST日付（DATE型）で保存されているため、JSTの日付文字列を返す
  const jstStartForDate = new Date(start.getTime() + jstOffset);
  const jstEndForDate = new Date(end.getTime() + jstOffset);
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    startDate: jstStartForDate.toISOString().split("T")[0],
    endDate: jstEndForDate.toISOString().split("T")[0],
  };
}
