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

    // 今日の日付（JST）
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayStart = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todayStartISO = todayStart.toISOString();
    const todayEndISO = todayEnd.toISOString();

    // 今月の開始日
    const monthStart = new Date(jstNow.getFullYear(), jstNow.getMonth(), 1);
    const monthStartISO = monthStart.toISOString();

    // 1. 本日の予約件数（reservationsテーブル）
    const { count: todayReservations } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("reserved_time", todayStartISO)
      .lt("reserved_time", todayEndISO)
      .neq("status", "cancelled");

    // 2. 本日の配送件数（ordersテーブル、shipping_dateが今日）
    const { data: todayShippingData } = await supabase
      .from("orders")
      .select("product_code, patient_id")
      .gte("shipping_date", todayStartISO.split("T")[0])
      .lt("shipping_date", todayEndISO.split("T")[0]);

    const todayShippingTotal = todayShippingData?.length || 0;

    // 新規・再処方の判定（簡易版：patient_idの初回注文か判定）
    const patientIds = todayShippingData?.map((o) => o.patient_id) || [];
    const uniquePatientIds = [...new Set(patientIds)];

    let todayShippingFirst = 0;
    let todayShippingReorder = 0;

    for (const patientId of uniquePatientIds) {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patientId)
        .lt("created_at", todayStartISO);

      if (count === 0) {
        todayShippingFirst++;
      } else {
        todayShippingReorder++;
      }
    }

    // 3. 本日の売上
    // Square（ordersテーブル、payment_method = 'card'、paid_atが今日）
    const { data: squareOrders } = await supabase
      .from("orders")
      .select("amount")
      .eq("payment_method", "card")
      .gte("paid_at", todayStartISO)
      .lt("paid_at", todayEndISO);

    const todaySquareRevenue = squareOrders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;

    // 銀行振込（bank_transfer_ordersテーブル、created_atが今日）
    const { data: bankTransferOrders } = await supabase
      .from("bank_transfer_orders")
      .select("product_code")
      .gte("created_at", todayStartISO)
      .lt("created_at", todayEndISO);

    // 商品コードから金額を計算（簡易版）
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

    const todayBankTransferRevenue =
      bankTransferOrders?.reduce((sum, o) => sum + (productPrices[o.product_code] || 0), 0) || 0;

    const todayTotalRevenue = todaySquareRevenue + todayBankTransferRevenue;

    // 4. リピート率（今月の再注文 / 今月の全注文）
    const { data: monthOrders } = await supabase
      .from("orders")
      .select("patient_id")
      .gte("paid_at", monthStartISO);

    const monthPatientIds = monthOrders?.map((o) => o.patient_id) || [];
    let monthReorderCount = 0;

    for (const patientId of monthPatientIds) {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("patient_id", patientId)
        .lt("created_at", monthStartISO);

      if (count && count > 0) {
        monthReorderCount++;
      }
    }

    const repeatRate =
      monthPatientIds.length > 0 ? Math.round((monthReorderCount / monthPatientIds.length) * 100) : 0;

    // 5. 今月の統計
    const { count: totalPatients } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true });

    const { count: activePatients } = await supabase
      .from("orders")
      .select("patient_id", { count: "exact", head: true })
      .gte("paid_at", monthStartISO);

    const { count: newPatients } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStartISO);

    return NextResponse.json({
      todayReservations: todayReservations || 0,
      todayShipping: {
        total: todayShippingTotal,
        first: todayShippingFirst,
        reorder: todayShippingReorder,
      },
      todayRevenue: {
        square: todaySquareRevenue,
        bankTransfer: todayBankTransferRevenue,
        total: todayTotalRevenue,
      },
      repeatRate,
      monthlyStats: {
        totalPatients: totalPatients || 0,
        activePatients: activePatients || 0,
        newPatients: newPatients || 0,
      },
    });
  } catch (error) {
    console.error("[dashboard-stats] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
