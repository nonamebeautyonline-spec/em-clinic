import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);

    console.log(`[TodayShipped] Fetching orders with shipping_list_created_at set and shipping_status=pending`);

    // ラベル作成済み＆追跡未付与（pending）の注文を取得（日付不問、返金済み除外）
    const { data: orders, error: ordersError } = await strictWithTenant(
      supabaseAdmin.from("orders").select("id, patient_id, tracking_number, shipping_list_created_at").not("shipping_list_created_at", "is", null).eq("shipping_status", "pending").is("tracking_number", null).or("refund_status.is.null,refund_status.neq.COMPLETED").order("shipping_list_created_at", { ascending: true }),
      tenantId
    );

    if (ordersError) {
      console.error("[TodayShipped] Orders fetch error:", ordersError);
      return NextResponse.json({ ok: false, error: "注文データ取得エラー", details: ordersError.message }, { status: 500 });
    }

    // 今日の日付（JST）
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayStr = `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;

    // 通知未送信の今日発送分を取得（この関数の後でも使うので先に取得）
    const { data: unnotified } = await strictWithTenant(
      supabaseAdmin.from("orders")
        .select("id, patient_id")
        .eq("shipping_date", todayStr)
        .eq("shipping_status", "shipped")
        .not("tracking_number", "is", null)
        .is("notify_shipped_at", null)
        .or("refund_status.is.null,refund_status.neq.COMPLETED"),
      tenantId
    );
    const unnotifiedCount = unnotified?.length || 0;

    if (!orders || orders.length === 0) {
      console.log("[TodayShipped] No pending orders found");
      return NextResponse.json({
        entries: [],
        summary: { total: 0, withTracking: 0, withoutTracking: 0 },
        unnotifiedCount,
      });
    }

    console.log(`[TodayShipped] Found ${orders.length} orders`);

    // patient_idリストを取得
    const patientIds = Array.from(new Set(orders.map((o: { patient_id: string }) => o.patient_id)));

    // patientsテーブルから患者名を取得
    const { data: pData } = await strictWithTenant(
      supabaseAdmin.from("patients").select("patient_id, name").in("patient_id", patientIds),
      tenantId
    );

    const patientNameMap: Record<string, string> = {};
    if (pData) {
      for (const p of pData) {
        patientNameMap[p.patient_id] = p.name || "";
      }
    }

    // エントリを作成
    const entries = orders.map((order: { id: string; patient_id: string; tracking_number: string | null }) => ({
      payment_id: order.id,
      patient_id: order.patient_id,
      patient_name: patientNameMap[order.patient_id] || "",
      tracking_number: order.tracking_number || "",
      matched: !!order.tracking_number,
    }));

    const withTracking = entries.filter((e) => e.tracking_number).length;

    return NextResponse.json({
      entries,
      summary: {
        total: entries.length,
        withTracking,
        withoutTracking: entries.length - withTracking,
      },
      unnotifiedCount,
    });
  } catch (error) {
    console.error("[TodayShipped] API error:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
