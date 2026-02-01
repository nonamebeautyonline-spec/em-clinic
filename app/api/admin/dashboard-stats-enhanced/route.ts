import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // 管理者トークン認証
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get("range") || "today";
    const customStart = searchParams.get("start");
    const customEnd = searchParams.get("end");

    // 日付範囲を計算
    const { startISO, endISO, startDate: reservationStartDate, endDate: reservationEndDate } = calculateDateRange(range, customStart, customEnd);

    // ページネーション用の定数
    const pageSize = 1000;

    // 1. 予約統計（reserved_dateで日付フィルタ）
    const { count: totalReservations } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("reserved_date", reservationStartDate)
      .lt("reserved_date", reservationEndDate);

    // 診察完了: status = "OK" or "NG"
    const { count: completedReservationsOK } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("reserved_date", reservationStartDate)
      .lt("reserved_date", reservationEndDate)
      .eq("status", "OK");

    const { count: completedReservationsNG } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("reserved_date", reservationStartDate)
      .lt("reserved_date", reservationEndDate)
      .eq("status", "NG");

    const completedReservations = (completedReservationsOK ?? 0) + (completedReservationsNG ?? 0);

    const { count: cancelledReservations } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("reserved_date", reservationStartDate)
      .lt("reserved_date", reservationEndDate)
      .eq("status", "canceled");

    const cancelRate =
      (totalReservations ?? 0) > 0 ? Math.round(((cancelledReservations ?? 0) / (totalReservations ?? 0)) * 100) : 0;

    // 2. 配送統計（shipping_date基準）
    // startISOとendISOからJST日付を取得
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);
    const jstStartMs = startDate.getTime() + 9 * 60 * 60 * 1000;
    const jstEndMs = endDate.getTime() + 9 * 60 * 60 * 1000;
    const jstStartDate = new Date(jstStartMs);
    const jstEndDate = new Date(jstEndMs);
    const shippingStartDate = jstStartDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const shippingEndDate = jstEndDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // 配送総数（countのみ）
    const { count: shippingTotal } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("shipping_date", shippingStartDate)
      .lt("shipping_date", shippingEndDate);

    // 新規/再処方判定用に実データを全件取得（patient_idのみ）
    let shippingOrders: any[] = [];
    let page = 0;

    while (true) {
      const { data: orders } = await supabase
        .from("orders")
        .select("patient_id, created_at")
        .gte("shipping_date", shippingStartDate)
        .lt("shipping_date", shippingEndDate)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!orders || orders.length === 0) break;
      shippingOrders = shippingOrders.concat(orders);
      if (orders.length < pageSize) break;
      page++;
    }

    // 新規・再処方の判定（最適化：注文単位で判定）
    let shippingFirst = 0;
    let shippingReorder = 0;

    if (shippingOrders && shippingOrders.length > 0) {
      // すべての患者IDを取得
      const allPatientIds = shippingOrders.map((o) => o.patient_id);
      const uniquePatientIds = [...new Set(allPatientIds)];

      // 範囲開始前の注文データを一括取得
      const { data: previousOrders } = await supabase
        .from("orders")
        .select("patient_id")
        .in("patient_id", uniquePatientIds)
        .lt("created_at", startISO);

      const previousPatientSet = new Set(previousOrders?.map((o) => o.patient_id) || []);

      // 各注文について、その患者が過去に注文したことがあるかチェック
      for (const order of shippingOrders) {
        if (previousPatientSet.has(order.patient_id)) {
          shippingReorder++;
        } else {
          shippingFirst++;
        }
      }
    }

    // 3. 売上統計（paid_atベース）
    // 全件取得のためにlimitを明示的に設定
    let allSquareOrders: any[] = [];
    page = 0;

    while (true) {
      const { data: squareOrders } = await supabase
        .from("orders")
        .select("amount")
        .eq("payment_method", "credit_card")
        .gte("paid_at", startISO)
        .lt("paid_at", endISO)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!squareOrders || squareOrders.length === 0) break;
      allSquareOrders = allSquareOrders.concat(squareOrders);
      if (squareOrders.length < pageSize) break;
      page++;
    }

    const squareRevenue = allSquareOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    // 銀行振込も全件取得
    let allBankTransferOrders: any[] = [];
    page = 0;

    while (true) {
      const { data: bankTransferOrders } = await supabase
        .from("bank_transfer_orders")
        .select("product_code")
        .gte("submitted_at", startISO)
        .lt("submitted_at", endISO)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!bankTransferOrders || bankTransferOrders.length === 0) break;
      allBankTransferOrders = allBankTransferOrders.concat(bankTransferOrders);
      if (bankTransferOrders.length < pageSize) break;
      page++;
    }

    const productPrices: Record<string, number> = {
      "MJL_2.5mg_1m": 13000,
      "MJL_2.5mg_2m": 25500,
      "MJL_2.5mg_3m": 35000,
      "MJL_5mg_1m": 22850,
      "MJL_5mg_2m": 45500,
      "MJL_5mg_3m": 63000,
      "MJL_7.5mg_1m": 34000,
      "MJL_7.5mg_2m": 65000,
      "MJL_7.5mg_3m": 96000,
    };

    const bankTransferRevenue =
      allBankTransferOrders.reduce((sum, o) => sum + (productPrices[o.product_code] || 0), 0);

    const totalRevenue = squareRevenue + bankTransferRevenue;
    const orderCount = allSquareOrders.length + allBankTransferOrders.length;
    const avgOrderAmount = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

    // 4. 商品別売上
    const productSales: Record<
      string,
      { code: string; name: string; count: number; revenue: number }
    > = {};

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

    // Square注文の集計（paid_atベース）
    let allSquareProductOrders: any[] = [];
    page = 0;

    while (true) {
      const { data: squareProductOrders } = await supabase
        .from("orders")
        .select("product_code, amount")
        .eq("payment_method", "credit_card")
        .gte("paid_at", startISO)
        .lt("paid_at", endISO)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!squareProductOrders || squareProductOrders.length === 0) break;
      allSquareProductOrders = allSquareProductOrders.concat(squareProductOrders);
      if (squareProductOrders.length < pageSize) break;
      page++;
    }

    allSquareProductOrders.forEach((order) => {
      const code = order.product_code;
      if (!productSales[code]) {
        productSales[code] = {
          code,
          name: productNames[code] || code,
          count: 0,
          revenue: 0,
        };
      }
      productSales[code].count++;
      productSales[code].revenue += order.amount || 0;
    });

    // 銀行振込注文の集計
    allBankTransferOrders.forEach((order) => {
      const code = order.product_code;
      if (!productSales[code]) {
        productSales[code] = {
          code,
          name: productNames[code] || code,
          count: 0,
          revenue: 0,
        };
      }
      productSales[code].count++;
      productSales[code].revenue += productPrices[code] || 0;
    });

    const products = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);

    // 5. 患者統計（最適化版）
    const { count: totalPatients } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true });

    // アクティブ患者の注文データを全件取得
    let activeOrdersData: any[] = [];
    page = 0;

    while (true) {
      const { data: orders } = await supabase
        .from("orders")
        .select("patient_id")
        .gte("paid_at", startISO)
        .lt("paid_at", endISO)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!orders || orders.length === 0) break;
      activeOrdersData = activeOrdersData.concat(orders);
      if (orders.length < pageSize) break;
      page++;
    }

    const activePatients = new Set(activeOrdersData.map((o) => o.patient_id)).size;

    const { count: newPatients } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startISO)
      .lt("created_at", endISO);

    // リピート率計算（最適化：一括クエリ）
    const orderPatientIds = activeOrdersData.map((o) => o.patient_id);
    let reorderCount = 0;

    if (orderPatientIds.length > 0) {
      const uniquePatientIds = [...new Set(orderPatientIds)];

      // 範囲開始前の注文を一括取得
      const { data: previousOrders } = await supabase
        .from("orders")
        .select("patient_id")
        .in("patient_id", uniquePatientIds)
        .lt("created_at", startISO);

      const previousPatientSet = new Set(previousOrders?.map((o) => o.patient_id) || []);

      // 期間内の注文について、その患者が過去に注文したことがあるかチェック
      for (const order of activeOrdersData) {
        if (previousPatientSet.has(order.patient_id)) {
          reorderCount++;
        }
      }
    }

    const repeatRate =
      orderPatientIds.length > 0 ? Math.round((reorderCount / orderPatientIds.length) * 100) : 0;

    // 6. 銀行振込状況
    const { count: pendingBankTransfer } = await supabase
      .from("bank_transfer_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_confirmation")
      .gte("submitted_at", startISO)
      .lt("submitted_at", endISO);

    const { count: confirmedBankTransfer } = await supabase
      .from("bank_transfer_orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed")
      .gte("submitted_at", startISO)
      .lt("submitted_at", endISO);

    // 7. 新しいKPI: 診療後の決済率
    // 診察完了した患者数（status = "OK" or "NG"）
    const { count: consultedPatients } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true })
      .in("status", ["OK", "NG"])
      .gte("created_at", startISO)
      .lt("created_at", endISO);

    // 診察完了した患者のpatient_idを取得
    let consultedPatientIds: any[] = [];
    page = 0;

    while (true) {
      const { data: consultedData } = await supabase
        .from("intake")
        .select("patient_id")
        .in("status", ["OK", "NG"])
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!consultedData || consultedData.length === 0) break;
      consultedPatientIds = consultedPatientIds.concat(consultedData);
      if (consultedData.length < pageSize) break;
      page++;
    }

    // その中で決済した患者数
    let paidPatientCount = 0;
    if (consultedPatientIds.length > 0) {
      const uniqueConsultedIds = [...new Set(consultedPatientIds.map(i => i.patient_id))];

      const { data: paidOrders } = await supabase
        .from("orders")
        .select("patient_id")
        .in("patient_id", uniqueConsultedIds)
        .not("paid_at", "is", null);

      paidPatientCount = new Set(paidOrders?.map(o => o.patient_id) || []).size;
    }

    const paymentRateAfterConsultation = (consultedPatients ?? 0) > 0
      ? Math.round((paidPatientCount / (consultedPatients ?? 0)) * 100)
      : 0;

    // 8. 新しいKPI: 問診後の予約率
    // 問診完了した患者数（全statusまたは特定のstatus？ここでは全intake）
    const { count: intakePatients } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startISO)
      .lt("created_at", endISO);

    // 問診した患者のpatient_idを取得
    let intakePatientIds: any[] = [];
    page = 0;

    while (true) {
      const { data: intakeData } = await supabase
        .from("intake")
        .select("patient_id")
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!intakeData || intakeData.length === 0) break;
      intakePatientIds = intakePatientIds.concat(intakeData);
      if (intakeData.length < pageSize) break;
      page++;
    }

    // その中で予約した患者数
    let reservedPatientCount = 0;
    if (intakePatientIds.length > 0) {
      const uniqueIntakeIds = [...new Set(intakePatientIds.map(i => i.patient_id))];

      const { data: reservations } = await supabase
        .from("reservations")
        .select("patient_id")
        .in("patient_id", uniqueIntakeIds);

      reservedPatientCount = new Set(reservations?.map(r => r.patient_id) || []).size;
    }

    const reservationRateAfterIntake = (intakePatients ?? 0) > 0
      ? Math.round((reservedPatientCount / (intakePatients ?? 0)) * 100)
      : 0;

    // 9. 新しいKPI: 予約後の受診率（診察完了率）
    // キャンセルを除いた予約総数
    const nonCancelledReservations = (totalReservations ?? 0) - (cancelledReservations ?? 0);
    const consultationCompletionRate = nonCancelledReservations > 0
      ? Math.round(((completedReservations ?? 0) / nonCancelledReservations) * 100)
      : 0;

    // 10. LINE登録者数（全期間）
    // countではなくデータを取得してカウント
    let allLineUsers: any[] = [];
    page = 0;

    while (true) {
      const { data: lineUsers } = await supabase
        .from("intake")
        .select("patient_id, line_user_id")
        .not("line_user_id", "is", null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!lineUsers || lineUsers.length === 0) break;
      allLineUsers = allLineUsers.concat(lineUsers);
      if (lineUsers.length < pageSize) break;
      page++;
    }

    const lineRegisteredCount = allLineUsers.length;

    // 11. 本日の予約された数（今日作成された予約の数）
    const { count: todayNewReservations } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startISO)
      .lt("created_at", endISO);

    // 12. 今日決済した人数（重複なし）
    let todayPaidPatients: any[] = [];
    page = 0;

    while (true) {
      const { data: paidOrders } = await supabase
        .from("orders")
        .select("patient_id")
        .not("paid_at", "is", null)
        .gte("paid_at", startISO)
        .lt("paid_at", endISO)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!paidOrders || paidOrders.length === 0) break;
      todayPaidPatients = todayPaidPatients.concat(paidOrders);
      if (paidOrders.length < pageSize) break;
      page++;
    }

    const todayPaidCount = new Set(todayPaidPatients.map(o => o.patient_id)).size;

    return NextResponse.json({
      reservations: {
        total: totalReservations || 0,
        completed: completedReservations || 0,
        cancelled: cancelledReservations || 0,
        cancelRate,
        consultationCompletionRate,
      },
      shipping: {
        total: shippingTotal || 0,
        first: shippingFirst,
        reorder: shippingReorder,
      },
      revenue: {
        square: squareRevenue,
        bankTransfer: bankTransferRevenue,
        total: totalRevenue,
        avgOrderAmount,
      },
      products,
      patients: {
        total: totalPatients || 0,
        active: activePatients,
        new: newPatients || 0,
        repeatRate,
      },
      bankTransfer: {
        pending: pendingBankTransfer || 0,
        confirmed: confirmedBankTransfer || 0,
      },
      kpi: {
        paymentRateAfterConsultation,
        reservationRateAfterIntake,
        consultationCompletionRate,
        lineRegisteredCount,
        todayNewReservations,
        todayPaidCount,
      },
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

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}
