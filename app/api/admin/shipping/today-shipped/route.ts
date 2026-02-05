import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 今日の0時〜23:59:59の範囲
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = tomorrow.toISOString();

    console.log(`[TodayShipped] Fetching orders with shipping_list_created_at between ${todayStart} and ${tomorrowStart}`);

    // 本日shipping_list_created_atが設定された注文を取得
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, patient_id, tracking_number")
      .gte("shipping_list_created_at", todayStart)
      .lt("shipping_list_created_at", tomorrowStart)
      .order("shipping_list_created_at", { ascending: true });

    if (ordersError) {
      console.error("[TodayShipped] Orders fetch error:", ordersError);
      return NextResponse.json(
        { error: "注文データ取得エラー", details: ordersError.message },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      console.log("[TodayShipped] No orders found for today");
      return NextResponse.json({
        entries: [],
        summary: {
          total: 0,
          withTracking: 0,
          withoutTracking: 0,
        },
      });
    }

    console.log(`[TodayShipped] Found ${orders.length} orders`);

    // patient_idリストを取得
    const patientIds = Array.from(new Set(orders.map((o: any) => o.patient_id)));

    // intakeテーブルから患者名を取得
    const { data: patients } = await supabase
      .from("intake")
      .select("patient_id, patient_name")
      .in("patient_id", patientIds);

    const patientNameMap: Record<string, string> = {};
    if (patients) {
      for (const p of patients) {
        patientNameMap[p.patient_id] = p.patient_name || "";
      }
    }

    // エントリを作成
    const entries = orders.map((order: any) => ({
      payment_id: order.id,
      patient_name: patientNameMap[order.patient_id] || "",
      tracking_number: order.tracking_number || "",
      matched: !!order.tracking_number, // 追跡番号がある場合はmatched
    }));

    const withTracking = entries.filter((e) => e.tracking_number).length;

    return NextResponse.json({
      entries,
      summary: {
        total: entries.length,
        withTracking,
        withoutTracking: entries.length - withTracking,
      },
    });
  } catch (error) {
    console.error("[TodayShipped] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
