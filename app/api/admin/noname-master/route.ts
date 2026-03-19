import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getProductNamesMap } from "@/lib/products";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);

    // ★ 商品名マップをDBから取得
    const PRODUCT_NAMES = await getProductNamesMap(tenantId ?? undefined);

    // クエリパラメータ
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "500");
    const offset = parseInt(searchParams.get("offset") || "0");
    const paymentMethod = searchParams.get("payment_method") || "all";
    const statusFilter = searchParams.get("status") || searchParams.get("filter") || "all";

    // ★ 発送漏れ判定用: 前日12時（JST）のカットオフタイム（フィルター用に先に計算）
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000; // JST = UTC+9
    const nowJST = new Date(now.getTime() + jstOffset);
    const yesterdayNoonJST = new Date(nowJST);
    yesterdayNoonJST.setDate(yesterdayNoonJST.getDate() - 1);
    yesterdayNoonJST.setHours(12, 0, 0, 0);
    const cutoffTime = new Date(yesterdayNoonJST.getTime() - jstOffset); // UTC に戻す
    const cutoffTimeISO = cutoffTime.toISOString();

    // ベースクエリを構築（テナントフィルター付き）
    let countQuery = strictWithTenant(supabaseAdmin.from("orders").select("*", { count: "exact", head: true }), tenantId);
    let dataQuery = strictWithTenant(
      supabaseAdmin
        .from("orders")
        .select("id, patient_id, product_code, amount, payment_method, status, paid_at, shipping_date, tracking_number, shipping_name, postal_code, address, phone, created_at, refund_status, refunded_at, refunded_amount"),
      tenantId
    );

    // 決済方法フィルター
    if (paymentMethod === "credit_card") {
      countQuery = countQuery.eq("payment_method", "credit_card");
      dataQuery = dataQuery.eq("payment_method", "credit_card");
    } else if (paymentMethod === "bank_transfer") {
      countQuery = countQuery.eq("payment_method", "bank_transfer");
      dataQuery = dataQuery.eq("payment_method", "bank_transfer");
    }

    // ステータスフィルター
    if (statusFilter === "unshipped") {
      // 未発送: tracking_numberなし かつ キャンセル/返金でない
      countQuery = countQuery.or("tracking_number.is.null,tracking_number.eq.").neq("status", "cancelled").is("refund_status", null);
      dataQuery = dataQuery.or("tracking_number.is.null,tracking_number.eq.").neq("status", "cancelled").is("refund_status", null);
    } else if (statusFilter === "shipped") {
      // 発送済み: tracking_numberがある
      countQuery = countQuery.not("tracking_number", "is", null).neq("tracking_number", "");
      dataQuery = dataQuery.not("tracking_number", "is", null).neq("tracking_number", "");
    } else if (statusFilter === "refund_cancel") {
      // 返金・キャンセル: status=cancelled または refund_statusあり
      countQuery = countQuery.or("status.eq.cancelled,refund_status.in.(PENDING,COMPLETED,FAILED,CANCELLED)");
      dataQuery = dataQuery.or("status.eq.cancelled,refund_status.in.(PENDING,COMPLETED,FAILED,CANCELLED)");
    } else if (statusFilter === "overdue") {
      // 後方互換: 発送漏れ
      countQuery = countQuery.or("tracking_number.is.null,tracking_number.eq.").lt("paid_at", cutoffTimeISO);
      dataQuery = dataQuery.or("tracking_number.is.null,tracking_number.eq.").lt("paid_at", cutoffTimeISO);
    }

    // 総件数を取得
    const { count: totalCount } = await countQuery;

    // ordersテーブルから決済を取得（ページネーション対応）
    const { data: orders, error } = await dataQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Supabase orders error:", error);
      return NextResponse.json({ ok: false, error: "Database error", details: error.message }, { status: 500 });
    }

    // 全患者IDを取得
    const patientIds = [...new Set((orders || []).map((o: { patient_id: string }) => o.patient_id))];

    // 患者名をpatientsテーブルから取得
    const patientNameMap: Record<string, string> = {};
    if (patientIds.length > 0) {
      const { data: pData } = await strictWithTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name")
          .in("patient_id", patientIds)
          .limit(100000),
        tenantId
      );

      (pData || []).forEach((p: { patient_id: string; name: string | null }) => {
        patientNameMap[p.patient_id] = p.name || "";
      });
    }

    // 購入回数を計算（各患者の注文数）- バッチ処理で高速化
    const purchaseCountMap: Record<string, number> = {};
    if (patientIds.length > 0) {
      const { data: allOrders } = await strictWithTenant(
        supabaseAdmin
          .from("orders")
          .select("patient_id")
          .in("patient_id", patientIds)
          .limit(100000),
        tenantId
      );

      // 患者IDごとにカウント
      (allOrders || []).forEach((order: { patient_id: string }) => {
        purchaseCountMap[order.patient_id] = (purchaseCountMap[order.patient_id] || 0) + 1;
      });
    }

    // データを整形
    interface OrderRow {
      id: string;
      patient_id: string;
      product_code: string;
      amount: number;
      payment_method: string;
      status: string | null;
      paid_at: string | null;
      shipping_date: string | null;
      tracking_number: string | null;
      shipping_name: string | null;
      postal_code: string | null;
      address: string | null;
      phone: string | null;
      created_at: string;
      refund_status: string | null;
      refunded_at: string | null;
      refunded_amount: number | null;
    }
    const formattedOrders = (orders || []).map((order: OrderRow) => {
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
        amount: order.amount || 0,
        postal_code: order.postal_code || "",
        address: order.address || "",
        phone: order.phone || "",
        payment_method: order.payment_method === "credit_card" ? "クレジットカード" : "銀行振込",
        payment_date: paymentDate,
        payment_date_label: paymentDateLabel, // ★ 銀行振込の申請中のみ "（申請日時）"
        shipping_date: order.shipping_date || "",
        tracking_number: order.tracking_number || "",
        purchase_count: purchaseCountMap[order.patient_id] || 1,
        is_overdue: isOverdue, // ★ 発送漏れフラグ
        status: order.status || null, // ★ ステータスバッジ用
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

    // 返金・キャンセルフィルター時は返金サマリーを追加
    let refund_summary = null;
    if (statusFilter === "refund_cancel") {
      const refundedOrders = formattedOrders.filter(o => o.refund_status && o.refund_status !== "CANCELLED");
      refund_summary = {
        count: refundedOrders.length,
        totalAmount: refundedOrders.reduce((sum, o) => sum + (o.refunded_amount || o.amount || 0), 0),
      };
    }

    return NextResponse.json({ orders: formattedOrders, total: totalCount || 0, refund_summary });
  } catch (error) {
    console.error("API error:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
