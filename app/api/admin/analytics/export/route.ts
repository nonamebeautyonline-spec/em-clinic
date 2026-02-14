// app/api/admin/analytics/export/route.ts — 売上データCSVエクスポート
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  let query = supabaseAdmin
    .from("orders")
    .select("patient_id, product_code, amount, payment_method, status, paid_at, refund_status, refunded_amount, refunded_at, shipping_date, tracking_number, created_at")
    .order("created_at", { ascending: false });

  if (from) query = query.gte("paid_at", from);
  if (to) query = query.lte("paid_at", to + "T23:59:59");

  const { data } = await query;
  if (!data || data.length === 0) {
    return new NextResponse("データがありません", { status: 404 });
  }

  // CSV生成
  const header = [
    "患者ID", "商品コード", "金額", "決済方法", "ステータス",
    "決済日時", "返金ステータス", "返金額", "返金日時",
    "配送日", "追跡番号", "作成日時",
  ];

  const rows = data.map(o => [
    o.patient_id || "",
    o.product_code || "",
    o.amount || "",
    o.payment_method || "",
    o.status || "",
    o.paid_at || "",
    o.refund_status || "",
    o.refunded_amount || "",
    o.refunded_at || "",
    o.shipping_date || "",
    o.tracking_number || "",
    o.created_at || "",
  ]);

  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  // BOM付きUTF-8（Excel対応）
  const bom = "\uFEFF";
  const fileName = `売上データ_${from || "all"}_${to || "all"}.csv`;

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
