// app/api/admin/billing/invoices/route.ts
// テナント側請求書一覧API（ページネーション対応）

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ error: "テナントが特定できません" }, { status: 400 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "12", 10)));
  const offset = (page - 1) * limit;

  try {
    const { data: invoices, error, count } = await supabaseAdmin
      .from("billing_invoices")
      .select("id, invoice_number, billing_period_start, billing_period_end, amount, tax_amount, total_amount, status, paid_at, stripe_invoice_id, notes, created_at", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[admin/billing/invoices] error:", error);
      return NextResponse.json({ ok: false, error: "請求書取得に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      invoices: invoices || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("[admin/billing/invoices] unexpected error:", err);
    return NextResponse.json({ ok: false, error: "予期しないエラー" }, { status: 500 });
  }
}
