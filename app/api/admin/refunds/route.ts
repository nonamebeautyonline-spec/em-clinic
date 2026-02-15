import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/refunds
 * 返金一覧を取得
 */
export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    // ordersテーブルから返金データを取得
    const { data: refunds, error } = await withTenant(
      supabaseAdmin
        .from("orders")
        .select("id, patient_id, amount, refunded_amount, refund_status, refunded_at, status, created_at, product_code, product_name")
        .or("refund_status.eq.COMPLETED,refund_status.eq.PENDING,refund_status.eq.FAILED,status.eq.refunded")
        .order("refunded_at", { ascending: false }),
      tenantId
    );

    if (error) {
      console.error("[admin/refunds] Database error:", error);
      return NextResponse.json({ ok: false, error: "database_error" }, { status: 500 });
    }

    // 患者名をpatientsテーブルから取得
    const patientIds = [...new Set((refunds || []).map((r: any) => r.patient_id).filter(Boolean))];
    const nameMap: Record<string, string> = {};
    if (patientIds.length > 0) {
      const { data: pData } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name")
          .in("patient_id", patientIds),
        tenantId
      );
      for (const p of pData || []) {
        if (p.name && !nameMap[p.patient_id]) {
          nameMap[p.patient_id] = p.name;
        }
      }
    }

    // 商品名マッピング
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
      "MJL_10mg_1m": "マンジャロ 10mg 1ヶ月",
      "MJL_10mg_2m": "マンジャロ 10mg 2ヶ月",
      "MJL_10mg_3m": "マンジャロ 10mg 3ヶ月",
    };

    const enriched = (refunds || []).map((r: any) => ({
      ...r,
      patient_name: nameMap[r.patient_id] || "",
      product_display: PRODUCT_NAMES[r.product_code] || r.product_name || r.product_code || "",
    }));

    return NextResponse.json({
      ok: true,
      refunds: enriched,
    });
  } catch (err) {
    console.error("[admin/refunds] Unexpected error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
