import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

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
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    // pending_confirmation の銀行振込注文を取得
    const { data: orders, error } = await withTenant(
      supabase
        .from("orders")
        .select("id, patient_id, product_code, amount, shipping_name, account_name, address, postal_code, phone, created_at")
        .eq("payment_method", "bank_transfer")
        .eq("status", "pending_confirmation")
        .order("created_at", { ascending: false }),
      tenantId
    );

    if (error) {
      console.error("Supabase pending orders error:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    // 患者IDのリストを取得
    const patientIds = [...new Set((orders || []).map((o: any) => o.patient_id))];

    // 患者名を取得（patientsテーブルから）
    const patientNameMap: Record<string, string> = {};
    if (patientIds.length > 0) {
      const { data: patients } = await withTenant(
        supabase
          .from("patients")
          .select("patient_id, name")
          .in("patient_id", patientIds),
        tenantId
      );

      (patients || []).forEach((p: any) => {
        patientNameMap[p.patient_id] = p.name || "";
      });
    }

    // データを整形
    const formattedOrders = (orders || []).map((order: any) => ({
      id: order.id,
      patient_id: order.patient_id,
      patient_name: patientNameMap[order.patient_id] || "",
      product_code: order.product_code,
      product_name: PRODUCT_NAMES[order.product_code] || order.product_code,
      amount: order.amount,
      shipping_name: order.shipping_name || "",
      account_name: order.account_name || "",
      address: order.address || "",
      postal_code: order.postal_code || "",
      phone: order.phone || "",
      created_at: order.created_at,
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
