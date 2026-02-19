import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getProductNamesMap } from "@/lib/products";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    // ★ 商品名マップをDBから取得（productsテーブルは既にテナント対応済み）
    const PRODUCT_NAMES = await getProductNamesMap(tenantId ?? undefined);

    const selectCols = "id, patient_id, product_code, payment_method, paid_at, shipping_date, tracking_number, amount, status, shipping_name, postal_code, address, phone, email, created_at, shipping_list_created_at";

    // ★ 全ての未発送confirmed注文（カットオフなし・発送漏れも自動検出）
    const { data: ordersConfirmed, error: ordersConfirmedError } = await withTenant(
      supabaseAdmin.from("orders").select(selectCols).is("shipping_date", null).eq("status", "confirmed").or("refund_status.is.null,refund_status.not.in.(COMPLETED,PENDING)").order("paid_at", { ascending: false }).limit(100000),
      tenantId
    );

    // ★ 振込確認待ち注文
    const { data: ordersPending, error: ordersPendingError } = await withTenant(
      supabaseAdmin.from("orders").select(selectCols).is("shipping_date", null).eq("status", "pending_confirmation").eq("payment_method", "bank_transfer").or("refund_status.is.null,refund_status.not.in.(COMPLETED,PENDING)").order("created_at", { ascending: false }).limit(100000),
      tenantId
    );

    const ordersError = ordersConfirmedError || ordersPendingError;

    // ★ confirmed と pending を時間順にマージ（新しい順）
    const orderIds = new Set<string>();
    const allOrders: any[] = [];

    for (const order of [...(ordersConfirmed || []), ...(ordersPending || [])]) {
      if (!orderIds.has(order.id)) {
        orderIds.add(order.id);
        allOrders.push(order);
      }
    }
    const orders = allOrders.sort((a, b) => {
      const timeA = a.paid_at || a.created_at;
      const timeB = b.paid_at || b.created_at;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    if (ordersError) {
      console.error("Supabase orders error:", ordersError);
      return NextResponse.json(
        { error: "Database error", details: ordersError.message },
        { status: 500 }
      );
    }

    // 全患者IDを取得
    const patientIds = [...new Set((orders || []).map((o: any) => o.patient_id))];

    // ★ 患者名をpatientsテーブルから取得、LステップIDはintakeから取得
    const patientInfoMap: Record<string, { name: string; lstep_id: string }> = {};

    if (patientIds.length > 0) {
      const { data: pData } = await withTenant(
        supabaseAdmin.from("patients").select("patient_id, name").in("patient_id", patientIds),
        tenantId
      );

      const { data: intakeData } = await withTenant(
        supabaseAdmin.from("intake").select("patient_id, answerer_id").in("patient_id", patientIds).not("answerer_id", "is", null).limit(100000),
        tenantId
      );

      const lstepMap = new Map<string, string>();
      for (const i of intakeData || []) {
        if (!lstepMap.has(i.patient_id)) {
          lstepMap.set(i.patient_id, i.answerer_id || "");
        }
      }

      (pData || []).forEach((p: any) => {
        patientInfoMap[p.patient_id] = {
          name: p.name || "",
          lstep_id: lstepMap.get(p.patient_id) || "",
        };
      });
    }

    // 購入回数を計算（各患者の注文数）- バッチ処理で高速化
    const purchaseCountMap: Record<string, number> = {};
    if (patientIds.length > 0) {
      const { data: allOrders } = await withTenant(
        supabaseAdmin.from("orders").select("patient_id").in("patient_id", patientIds).limit(100000),
        tenantId
      );

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
        shipping_list_created_at: order.shipping_list_created_at || null,
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
