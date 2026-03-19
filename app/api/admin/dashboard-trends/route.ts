import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

// 売上トレンドAPI: 月別・年別の売上推移と前期比較を提供（RPC版）
export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(request);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(request);
    const searchParams = request.nextUrl.searchParams;
    const granularity = searchParams.get("granularity") || "monthly";
    const monthsBack = parseInt(searchParams.get("months") || "12", 10);

    const { data, error } = await supabaseAdmin.rpc("dashboard_revenue_trends", {
      p_tenant_id: tenantId,
      p_mode: granularity,
      p_months: monthsBack,
    });

    if (error) {
      console.error("[dashboard-trends] RPC error:", error);
      return serverError(error.message);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[dashboard-trends] Error:", error);
    return serverError(error instanceof Error ? error.message : "Internal server error");
  }
}
