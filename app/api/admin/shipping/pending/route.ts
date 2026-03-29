import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getProductNamesMap } from "@/lib/products";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

interface OrderRow {
  id: string;
  patient_id: string;
  product_code: string;
  payment_method: string;
  paid_at: string | null;
  shipping_date: string | null;
  tracking_number: string | null;
  amount: number | null;
  status: string;
  shipping_name: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  shipping_list_created_at: string | null;
}

interface PatientRow {
  patient_id: string;
  name: string | null;
}

interface FormattedOrder {
  id: string;
  patient_id: string;
  patient_name: string;
  product_code: string;
  product_name: string;
  payment_method: string;
  payment_date: string;
  amount: number;
  status: string;
  postal_code: string;
  address: string;
  phone: string;
  email: string;
  purchase_count: number;
  tracking_number: string;
  shipping_list_created_at: string | null;
}

export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);

    // ★ 商品名マップをDBから取得（productsテーブルは既にテナント対応済み）
    const PRODUCT_NAMES = await getProductNamesMap(tenantId ?? undefined);

    const selectCols = "id, patient_id, product_code, payment_method, paid_at, shipping_date, tracking_number, amount, status, shipping_name, postal_code, address, phone, email, created_at, shipping_list_created_at";

    // ★ 全ての未発送confirmed注文（カットオフなし・発送漏れも自動検出）
    const { data: ordersConfirmed, error: ordersConfirmedError } = await strictWithTenant(
      supabaseAdmin.from("orders").select(selectCols).is("shipping_date", null).eq("status", "confirmed").or("refund_status.is.null,refund_status.not.in.(COMPLETED,PENDING)").order("paid_at", { ascending: false }).limit(100000),
      tenantId
    );

    // ★ 振込確認待ち注文
    const { data: ordersPending, error: ordersPendingError } = await strictWithTenant(
      supabaseAdmin.from("orders").select(selectCols).is("shipping_date", null).eq("status", "pending_confirmation").eq("payment_method", "bank_transfer").or("refund_status.is.null,refund_status.not.in.(COMPLETED,PENDING)").order("created_at", { ascending: false }).limit(100000),
      tenantId
    );

    const ordersError = ordersConfirmedError || ordersPendingError;

    // ★ confirmed と pending を時間順にマージ（新しい順）
    const orderIds = new Set<string>();
    const allOrders: OrderRow[] = [];

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
      return NextResponse.json({ ok: false, error: "Database error", details: ordersError.message }, { status: 500 });
    }

    // 全患者IDを取得
    const patientIds = [...new Set((orders || []).map((o: OrderRow) => o.patient_id))];

    // ★ 患者名をpatientsテーブルから取得
    const patientNameMap: Record<string, string> = {};

    if (patientIds.length > 0) {
      const { data: pData } = await strictWithTenant(
        supabaseAdmin.from("patients").select("patient_id, name").in("patient_id", patientIds),
        tenantId
      );

      (pData || []).forEach((p: PatientRow) => {
        patientNameMap[p.patient_id] = p.name || "";
      });
    }

    // 購入回数を計算（各患者の注文数）- バッチ処理で高速化
    const purchaseCountMap: Record<string, number> = {};
    if (patientIds.length > 0) {
      const { data: allPatientOrders } = await strictWithTenant(
        supabaseAdmin.from("orders").select("patient_id").in("patient_id", patientIds).limit(100000),
        tenantId
      );

      // 患者IDごとにカウント
      (allPatientOrders || []).forEach((order: { patient_id: string }) => {
        purchaseCountMap[order.patient_id] = (purchaseCountMap[order.patient_id] || 0) + 1;
      });
    }

    // ★ Plan A: データを整形（住所はordersから直接取得）
    const formattedOrders = (orders || []).map((order: OrderRow) => {
      const patientName = patientNameMap[order.patient_id] || "";
      // ★ shipping_nameの正規化（"null"文字列や空文字をnullとして扱う）
      const shippingName = order.shipping_name && order.shipping_name !== "null" ? order.shipping_name : "";

      return {
        id: order.id,
        patient_id: order.patient_id,
        // ★ 氏名: shipping_name優先、なければpatients.name
        patient_name: shippingName || patientName,
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

    // ── まとめ配送候補: 同一patient_idで複数注文（最も確実） ──
    const groupedByPatient = formattedOrders.reduce<Record<string, FormattedOrder[]>>((acc, order) => {
      if (!order.patient_id) return acc;
      if (!acc[order.patient_id]) acc[order.patient_id] = [];
      acc[order.patient_id].push(order);
      return acc;
    }, {});

    const mergeableGroups = Object.entries(groupedByPatient)
      .filter(([, orders]) => {
        if (orders.length < 2) return false;
        // ★ まだラベル未発行の注文が2件以上あるグループのみ表示
        // （全員発行済みなら再度統合モーダルに出す必要なし）
        const unprocessed = orders.filter(o => !o.shipping_list_created_at);
        return unprocessed.length >= 2;
      })
      .map(([patientId, orders]) => ({
        patient_id: patientId,
        patient_name: orders[0].patient_name,
        postal_code: orders[0].postal_code || "",
        count: orders.length,
        orders: orders,
      }));

    // ── 同一郵便番号で異なるpatient_id（同居家族候補・参考情報） ──
    const groupedByPostal = formattedOrders.reduce<Record<string, FormattedOrder[]>>((acc, order) => {
      const postalKey = (order.postal_code || "").replace(/[-\s\u3000]/g, "").trim();
      if (!postalKey) return acc;
      if (!acc[postalKey]) acc[postalKey] = [];
      acc[postalKey].push(order);
      return acc;
    }, {});

    // 同一郵便番号に異なるpatient_idが含まれるグループのみ（同一患者は上で処理済み）
    const sameAddressGroups = Object.entries(groupedByPostal)
      .filter(([, orders]) => {
        const uniquePatients = new Set(orders.map(o => o.patient_id));
        if (uniquePatients.size <= 1) return false;
        // ★ ラベル未発行の注文が2件以上あるグループのみ
        const unprocessed = orders.filter(o => !o.shipping_list_created_at);
        return unprocessed.length >= 2;
      })
      .map(([postalCode, orders]) => ({
        postal_code: postalCode,
        patient_names: orders.map(o => o.patient_name).filter((v, i, a) => a.indexOf(v) === i),
        count: orders.length,
        orders: orders,
      }));

    // ── 同姓同名で郵便番号が異なるグループ（注意喚起） ──
    const groupedByName = formattedOrders.reduce<Record<string, FormattedOrder[]>>((acc, order) => {
      const nameKey = (order.patient_name || "").trim();
      if (!nameKey) return acc;
      if (!acc[nameKey]) acc[nameKey] = [];
      acc[nameKey].push(order);
      return acc;
    }, {});

    const sameNameDiffAddress = Object.entries(groupedByName)
      .filter(([, orders]) => {
        if (orders.length < 2) return false;
        // ★ ラベル未発行の注文が2件以上なければスキップ
        const unprocessed = orders.filter(o => !o.shipping_list_created_at);
        if (unprocessed.length < 2) return false;
        const uniquePatients = new Set(unprocessed.map(o => o.patient_id));
        if (uniquePatients.size < 2) return false; // 同一患者は除外
        const postals = new Set(unprocessed.map(o => (o.postal_code || "").replace(/[-\s\u3000]/g, "")));
        return postals.size > 1; // 同姓同名だが郵便番号が異なる
      })
      .map(([name, orders]) => ({
        patient_name: name,
        count: orders.length,
        postal_codes: [...new Set(orders.map(o => o.postal_code))],
      }));

    return NextResponse.json({
      orders: formattedOrders,
      mergeableGroups: mergeableGroups,
      sameAddressGroups: sameAddressGroups,
      sameNameDiffAddress: sameNameDiffAddress,
      total: formattedOrders.length,
    });
  } catch (error) {
    console.error("API error:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
