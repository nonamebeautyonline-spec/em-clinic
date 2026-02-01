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

    // 前回締め切り時刻を計算（デフォルト: 昨日の15時）
    const searchParams = req.nextUrl.searchParams;
    const cutoffParam = searchParams.get("cutoff");

    let cutoffTime: Date;
    if (cutoffParam) {
      cutoffTime = new Date(cutoffParam);
    } else {
      // 昨日の15時（JST）
      const now = new Date();
      const jstOffset = 9 * 60 * 60 * 1000; // UTC+9
      const jstNow = new Date(now.getTime() + jstOffset);

      // 昨日の日付を取得
      const yesterday = new Date(jstNow);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);

      // 昨日の15時（JST）= 昨日の06:00（UTC）
      cutoffTime = new Date(Date.UTC(
        yesterday.getUTCFullYear(),
        yesterday.getUTCMonth(),
        yesterday.getUTCDate(),
        6, // 15時 - 9時間 = 6時（UTC）
        0,
        0
      ));
    }

    const cutoffISO = cutoffTime.toISOString();

    // ★ ordersテーブルから未発送の注文を取得（confirmed + pending_confirmation、住所情報も含む）
    const { data: ordersConfirmed, error: ordersConfirmedError } = await supabase
      .from("orders")
      .select("id, patient_id, product_code, payment_method, paid_at, shipping_date, tracking_number, amount, status, shipping_name, postal_code, address, phone, email, created_at")
      .is("shipping_date", null)
      .eq("status", "confirmed")
      .gte("paid_at", cutoffISO)
      .order("paid_at", { ascending: false });

    const { data: ordersPending, error: ordersPendingError } = await supabase
      .from("orders")
      .select("id, patient_id, product_code, payment_method, paid_at, shipping_date, tracking_number, amount, status, shipping_name, postal_code, address, phone, email, created_at")
      .is("shipping_date", null)
      .eq("status", "pending_confirmation")
      .eq("payment_method", "bank_transfer")
      .gte("created_at", cutoffISO)
      .order("created_at", { ascending: false });

    const ordersError = ordersConfirmedError || ordersPendingError;
    const orders = [...(ordersConfirmed || []), ...(ordersPending || [])];

    if (ordersError) {
      console.error("Supabase orders error:", ordersError);
      return NextResponse.json(
        { error: "Database error", details: ordersError.message },
        { status: 500 }
      );
    }

    // 全患者IDを取得
    const patientIds = [...new Set((orders || []).map((o: any) => o.patient_id))];

    // ★ 患者名とLステップIDだけintakeから取得
    const patientInfoMap: Record<string, { name: string; lstep_id: string }> = {};

    if (patientIds.length > 0) {
      const { data: patients } = await supabase
        .from("intake")
        .select("patient_id, patient_name, answerer_id")
        .in("patient_id", patientIds);

      (patients || []).forEach((p: any) => {
        patientInfoMap[p.patient_id] = {
          name: p.patient_name || "",
          lstep_id: p.answerer_id || "",
        };
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

    // ★ Plan A: データを整形（住所はordersから直接取得）
    const formattedOrders = (orders || []).map((order: any) => {
      const patientInfo = patientInfoMap[order.patient_id] || {};
      // ★ shipping_nameの正規化（"null"文字列や空文字をnullとして扱う）
      const shippingName = order.shipping_name && order.shipping_name !== "null" ? order.shipping_name : "";

      return {
        id: order.id,
        patient_id: order.patient_id,
        // ★ 氏名: shipping_name優先、なければintake.patient_name
        patient_name: shippingName || patientInfo.name || "",
        lstep_id: patientInfo.lstep_id || "",
        product_code: order.product_code,
        product_name: PRODUCT_NAMES[order.product_code] || order.product_code,
        payment_method: order.payment_method === "credit_card" ? "クレジットカード" : "銀行振込",
        payment_date: order.paid_at || order.created_at, // ★ pending時はcreated_atを使用
        amount: order.amount || 0,
        status: order.status, // ★ ステータスを追加（フロントエンドでグレーアウト判定に使用）
        // ★ 住所情報はordersテーブルから
        postal_code: order.postal_code || "",
        address: order.address || "",
        phone: order.phone || "",
        email: order.email || "",
        purchase_count: purchaseCountMap[order.patient_id] || 0,
        tracking_number: order.tracking_number || "",
      };
    });

    // 同一患者でグルーピング
    const groupedByPatient = formattedOrders.reduce((acc: any, order: any) => {
      if (!acc[order.patient_id]) {
        acc[order.patient_id] = [];
      }
      acc[order.patient_id].push(order);
      return acc;
    }, {});

    // まとめ配送候補を検出（同一患者で複数注文）
    const mergeableGroups = Object.entries(groupedByPatient)
      .filter(([_, orders]: [string, any]) => orders.length > 1)
      .map(([patientId, orders]: [string, any]) => ({
        patient_id: patientId,
        patient_name: orders[0].patient_name,
        count: orders.length,
        orders: orders,
      }));

    return NextResponse.json({
      orders: formattedOrders,
      mergeableGroups: mergeableGroups,
      total: formattedOrders.length,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
