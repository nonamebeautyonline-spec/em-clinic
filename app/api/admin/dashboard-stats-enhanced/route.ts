import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    // 診察完了: Drstatusが"OK"または"NG"のユニークな患者数
    const { data: completedPatientsOK } = await supabase
      .from("reservations")
      .select("patient_id")
      .gte("reserved_date", reservationStartDate)
      .lt("reserved_date", reservationEndDate)
      .eq("status", "OK")
      .limit(100000);

    const { data: completedPatientsNG } = await supabase
      .from("reservations")
      .select("patient_id")
      .gte("reserved_date", reservationStartDate)
      .lt("reserved_date", reservationEndDate)
      .eq("status", "NG")
      .limit(100000);

    // ユニークな患者IDを集計
    const allCompletedPatientIds = [
      ...(completedPatientsOK?.map(r => r.patient_id) || []),
      ...(completedPatientsNG?.map(r => r.patient_id) || [])
    ];
    const completedReservations = new Set(allCompletedPatientIds.filter(id => id)).size;

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
        .lt("created_at", startISO)
        .limit(100000);

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
    // ★ 最適化: 必要なフィールドを一度にすべて取得（patient_id, created_at, amountを同時に取得）
    let allSquareOrders: any[] = [];
    page = 0;

    while (true) {
      const { data: squareOrders } = await supabase
        .from("orders")
        .select("amount, patient_id, created_at, product_code")
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

    // ★ 最適化: 銀行振込も必要なフィールドを一度にすべて取得（ordersテーブルから直接取得）
    let allBankTransferOrders: any[] = [];
    page = 0;

    while (true) {
      const { data: bankTransferOrders } = await supabase
        .from("orders")
        .select("amount, product_code, patient_id, created_at")
        .eq("payment_method", "bank_transfer")
        .in("status", ["pending_confirmation", "confirmed"])
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!bankTransferOrders || bankTransferOrders.length === 0) break;
      allBankTransferOrders = allBankTransferOrders.concat(bankTransferOrders);
      if (bankTransferOrders.length < pageSize) break;
      page++;
    }

    const bankTransferRevenue =
      allBankTransferOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    const grossRevenue = squareRevenue + bankTransferRevenue;
    const orderCount = allSquareOrders.length + allBankTransferOrders.length;

    // ★ 返金データを取得（refund_status = COMPLETED）
    let allRefundedOrders: any[] = [];
    page = 0;

    while (true) {
      const { data: refundedOrders } = await supabase
        .from("orders")
        .select("id, amount, refunded_amount, refund_status, refunded_at, product_code")
        .eq("refund_status", "COMPLETED")
        .gte("refunded_at", startISO)
        .lt("refunded_at", endISO)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!refundedOrders || refundedOrders.length === 0) break;
      allRefundedOrders = allRefundedOrders.concat(refundedOrders);
      if (refundedOrders.length < pageSize) break;
      page++;
    }

    // 返金総額を計算（refunded_amountがあればそれを使用、なければamountを使用）
    const totalRefunded = allRefundedOrders.reduce((sum, o) => {
      const refundAmount = o.refunded_amount ?? o.amount ?? 0;
      return sum + refundAmount;
    }, 0);

    const totalRevenue = grossRevenue - totalRefunded;
    const avgOrderAmount = orderCount > 0 ? Math.round(grossRevenue / orderCount) : 0;

    // ★ 最適化: 再処方決済数を計算（すでに取得したデータを使用）
    let reorderOrderCount = 0;
    const allPaidOrders = [
      ...allSquareOrders.map(o => ({ patient_id: o.patient_id || null, created_at: o.created_at || null })),
      ...allBankTransferOrders.map(o => ({ patient_id: o.patient_id || null, created_at: o.created_at || null }))
    ];

    if (allPaidOrders.length > 0) {
      const allPaidPatientIds = allPaidOrders.map(o => o.patient_id).filter(id => id);
      const uniquePaidPatientIds = [...new Set(allPaidPatientIds)];

      if (uniquePaidPatientIds.length > 0) {
        // 範囲開始前の注文を一括取得
        const { data: previousOrders } = await supabase
          .from("orders")
          .select("patient_id")
          .in("patient_id", uniquePaidPatientIds)
          .lt("created_at", startISO)
          .limit(100000);

        const previousPatientSet = new Set(previousOrders?.map(o => o.patient_id) || []);

        // 各注文について、その患者が過去に注文したことがあるかチェック
        for (const order of allPaidOrders) {
          if (order.patient_id && previousPatientSet.has(order.patient_id)) {
            reorderOrderCount++;
          }
        }
      }
    }

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

    // ★ 最適化: すでに取得したallSquareOrdersを再利用
    allSquareOrders.forEach((order) => {
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
      productSales[code].revenue += order.amount || 0;
    });

    const products = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);

    // 5. 患者統計（最適化版）
    const { count: totalPatients } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true });

    // ★ 最適化: すでに取得したallPaidOrdersを再利用
    const activePatients = new Set(allPaidOrders.map((o) => o.patient_id).filter(id => id)).size;

    const { count: newPatients } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startISO)
      .lt("created_at", endISO);

    // ★ 最適化: リピート率計算は既に算出済みのreorderOrderCountを使用
    const repeatRate =
      allPaidOrders.length > 0 ? Math.round((reorderOrderCount / allPaidOrders.length) * 100) : 0;

    // 6. 銀行振込状況（ordersテーブルから取得）
    const { count: pendingBankTransfer } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("payment_method", "bank_transfer")
      .eq("status", "pending_confirmation")
      .gte("created_at", startISO)
      .lt("created_at", endISO);

    const { count: confirmedBankTransfer } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("payment_method", "bank_transfer")
      .eq("status", "confirmed")
      .gte("created_at", startISO)
      .lt("created_at", endISO);

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
        .not("paid_at", "is", null)
        .limit(100000);

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
        .in("patient_id", uniqueIntakeIds)
        .limit(100000);

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

    // 10. LINE登録者数（全期間）- Supabaseから直接取得
    const { count: lineRegisteredCount } = await supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .not("line_user_id", "is", null);

    // 11. 本日の予約された数（今日作成された予約の数）
    const { count: todayNewReservations } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startISO)
      .lt("created_at", endISO);

    // ★ 最適化: 今日決済した人数（すでに取得したallPaidOrdersを使用）
    const todayPaidCount = new Set(allPaidOrders.map(o => o.patient_id).filter(id => id)).size;

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
