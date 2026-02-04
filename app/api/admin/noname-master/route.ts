import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PRODUCT_NAMES: Record<string, string> = {
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

export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // クエリパラメータ: limit, include_pending
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const includePending = searchParams.get("include_pending") === "true";

    // ordersテーブルから全決済を取得（★ shipping_name, statusを追加）
    // ★ デフォルトでpending_confirmationを除外（銀行振込申請中を除外）
    let query = supabase
      .from("orders")
      .select("id, patient_id, product_code, amount, payment_method, status, paid_at, shipping_date, tracking_number, shipping_name, created_at");

    // pending_confirmation除外（デフォルト）
    if (!includePending) {
      query = query.not("status", "eq", "pending_confirmation");
    }

    const { data: orders, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Supabase orders error:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    // 全患者IDを取得
    const patientIds = [...new Set((orders || []).map((o: any) => o.patient_id))];

    // 患者名を取得（intakeテーブルから）
    const patientNameMap: Record<string, string> = {};
    if (patientIds.length > 0) {
      const { data: patients } = await supabase
        .from("intake")
        .select("patient_id, patient_name")
        .in("patient_id", patientIds);

      (patients || []).forEach((p: any) => {
        patientNameMap[p.patient_id] = p.patient_name || "";
      });
    }

    // 購入回数を計算（各患者の注文数）- バッチ処理で高速化
    const purchaseCountMap: Record<string, number> = {};
    if (patientIds.length > 0) {
      const { data: allOrders } = await supabase
        .from("orders")
        .select("patient_id")
        .in("patient_id", patientIds);

      // 患者IDごとにカウント
      (allOrders || []).forEach((order: any) => {
        purchaseCountMap[order.patient_id] = (purchaseCountMap[order.patient_id] || 0) + 1;
      });
    }

    // データを整形
    const formattedOrders = (orders || []).map((order: any) => {
      // ★ shipping_nameの正規化（"null"文字列や空文字をnullとして扱う）
      const shippingName = order.shipping_name && order.shipping_name !== "null" ? order.shipping_name : "";

      // ★ 決済日時の判定: 銀行振込の場合、照合済みなら paid_at、申請中なら created_at
      const isBankTransfer = order.payment_method === "bank_transfer";
      const isPendingConfirmation = order.status === "pending_confirmation";
      let paymentDate = order.paid_at || order.created_at;
      let paymentDateLabel = "";

      if (isBankTransfer && isPendingConfirmation) {
        paymentDate = order.created_at;
        paymentDateLabel = "（申請中）";
      }

      return {
        id: order.id,
        patient_id: order.patient_id,
        // ★ 氏名: shipping_name優先、なければintake.patient_name
        patient_name: shippingName || patientNameMap[order.patient_id] || "",
        product_code: order.product_code,
        product_name: PRODUCT_NAMES[order.product_code] || order.product_code,
        payment_method: order.payment_method === "credit_card" ? "クレジットカード" : "銀行振込",
        payment_date: paymentDate,
        payment_date_label: paymentDateLabel, // ★ 銀行振込の申請中のみ "（申請日時）"
        shipping_date: order.shipping_date || "",
        tracking_number: order.tracking_number || "",
        purchase_count: purchaseCountMap[order.patient_id] || 1,
      };
    });

    // ★ payment_date（実際の決済/申請日時）で降順ソート
    formattedOrders.sort((a, b) => {
      const dateA = new Date(a.payment_date || "").getTime();
      const dateB = new Date(b.payment_date || "").getTime();
      return dateB - dateA; // 新しい順
    });

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
