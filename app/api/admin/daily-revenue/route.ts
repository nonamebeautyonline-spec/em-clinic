import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth, getAdminTenantId } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET: 日別売上データ取得（RPC一括集計）
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get("year_month");

    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json({ ok: false, error: "invalid_year_month" }, { status: 400 });
    }

    const [year, month] = yearMonth.split("-").map(Number);
    const startDate = `${yearMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${yearMonth}-${String(lastDay).padStart(2, "0")}`; // 月末日

    const tenantId = resolveTenantId(req) || await getAdminTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc("daily_revenue_summary", {
      p_tenant_id: tenantId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error("[daily-revenue] RPC error:", error);
      return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: data.data,
      summary: data.summary,
    });
  } catch (err) {
    console.error("[daily-revenue] Exception:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
