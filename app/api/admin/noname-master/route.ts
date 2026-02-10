import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getProductNamesMap } from "@/lib/products";

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

    // ★ 商品名マップをDBから取得
    const PRODUCT_NAMES = await getProductNamesMap();

    // クエリパラメータ: limit, offset, filter
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "500");
    const offset = parseInt(searchParams.get("offset") || "0");
    const filter = searchParams.get("filter") || "all"; // all, unshipped, shipped, overdue

    // ★ 発送漏れ判定用: 前日12時（JST）のカットオフタイム（フィルター用に先に計算）
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000; // JST = UTC+9
    const nowJST = new Date(now.getTime() + jstOffset);
    const yesterdayNoonJST = new Date(nowJST);
    yesterdayNoonJST.setDate(yesterdayNoonJST.getDate() - 1);
    yesterdayNoonJST.setHours(12, 0, 0, 0);
    const cutoffTime = new Date(yesterdayNoonJST.getTime() - jstOffset); // UTC に戻す
    const cutoffTimeISO = cutoffTime.toISOString();

    // ベースクエリを構築
    let countQuery = supabase.from("orders").select("*", { count: "exact", head: true });
    let dataQuery = supabase
      .from("orders")
      .select("id, patient_id, product_code, amount, payment_method, status, paid_at, shipping_date, tracking_number, shipping_name, created_at, refund_status, refunded_at, refunded_amount");

    // フィルター適用
    if (filter === "unshipped") {
      // 未発送: tracking_numberがnullまたは空
      countQuery = countQuery.or("tracking_number.is.null,tracking_number.eq.");
      dataQuery = dataQuery.or("tracking_number.is.null,tracking_number.eq.");
    } else if (filter === "shipped") {
      // 発送済み: tracking_numberがある
      countQuery = countQuery.not("tracking_number", "is", null).neq("tracking_number", "");
      dataQuery = dataQuery.not("tracking_number", "is", null).neq("tracking_number", "");
    } else if (filter === "overdue") {
      // 発送漏れ: 未発送 かつ 前日12時以前の決済
      countQuery = countQuery
        .or("tracking_number.is.null,tracking_number.eq.")
        .lt("paid_at", cutoffTimeISO);
      dataQuery = dataQuery
        .or("tracking_number.is.null,tracking_number.eq.")
        .lt("paid_at", cutoffTimeISO);
    }

    // 総件数を取得
    const { count: totalCount } = await countQuery;

    // ordersテーブルから決済を取得（ページネーション対応）
    const { data: orders, error } = await dataQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

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
        .in("patient_id", patientIds)
        .limit(100000);

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
        .in("patient_id", patientIds)
        .limit(100000);

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

      // ★ 発送漏れ判定: 前日12時以前の決済 かつ 未発送
      const paymentTime = new Date(paymentDate).getTime();
      const hasTracking = order.tracking_number && order.tracking_number !== "";
      const isOverdue = !hasTracking && paymentTime < cutoffTime.getTime();

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
        is_overdue: isOverdue, // ★ 発送漏れフラグ
        refund_status: order.refund_status || null,
        refunded_at: order.refunded_at || null,
        refunded_amount: order.refunded_amount || null,
      };
    });

    // ★ payment_date（実際の決済/申請日時）で降順ソート
    formattedOrders.sort((a, b) => {
      const dateA = new Date(a.payment_date || "").getTime();
      const dateB = new Date(b.payment_date || "").getTime();
      return dateB - dateA; // 新しい順
    });

    return NextResponse.json({ orders: formattedOrders, total: totalCount || 0 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
