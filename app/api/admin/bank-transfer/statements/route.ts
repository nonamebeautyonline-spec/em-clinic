// app/api/admin/bank-transfer/statements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { unauthorized, serverError } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 入出金明細取得API
 * GET /api/admin/bank-transfer/statements?month=2026-03&page=1&limit=50&filter=all|reconciled|unreconciled
 */
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantId(req);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;
    const filter = searchParams.get("filter") || "all"; // all, reconciled, unreconciled

    // 利用可能な月一覧を取得
    const { data: monthsData } = await withTenant(
      supabase
        .from("bank_statements")
        .select("month")
        .order("month", { ascending: false }),
      tenantId
    );

    const uniqueMonths = [...new Set((monthsData || []).map((r: Record<string, unknown>) => r.month as string))];

    // 対象月（指定なしの場合は最新月）
    const targetMonth = month || uniqueMonths[0] || "";

    if (!targetMonth) {
      return NextResponse.json({ statements: [], total: 0, months: [], month: "" });
    }

    // 件数取得
    let countQuery = supabase
      .from("bank_statements")
      .select("id", { count: "exact", head: true })
      .eq("month", targetMonth);
    if (filter === "reconciled") countQuery = countQuery.eq("reconciled", true);
    if (filter === "unreconciled") countQuery = countQuery.eq("reconciled", false);

    const { count } = await withTenant(countQuery, tenantId);

    // 明細取得
    let dataQuery = supabase
      .from("bank_statements")
      .select("id, transaction_date, description, deposit, withdrawal, balance, reconciled, matched_order_id, csv_filename, uploaded_at")
      .eq("month", targetMonth);
    if (filter === "reconciled") dataQuery = dataQuery.eq("reconciled", true);
    if (filter === "unreconciled") dataQuery = dataQuery.eq("reconciled", false);

    const { data: statements, error } = await withTenant(
      dataQuery
        .order("transaction_date", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1),
      tenantId
    );

    if (error) {
      console.error("[Statements] fetch error:", error);
      return serverError(error.message);
    }

    return NextResponse.json({
      statements: statements || [],
      total: count || 0,
      months: uniqueMonths,
      month: targetMonth,
    });
  } catch (e) {
    console.error("[Statements] error:", e);
    return serverError(e instanceof Error ? e.message : "サーバーエラー");
  }
}
