import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

// 初診→再診転換率API: 月別コホート分析を提供（RPC版）
export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(request);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(request);

    const { data, error } = await supabaseAdmin.rpc("dashboard_conversion_cohorts", {
      p_tenant_id: tenantId,
      p_months: 12,
    });

    if (error) {
      console.error("[dashboard-conversion] RPC error:", error);
      return serverError(error.message);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[dashboard-conversion] Error:", error);
    return serverError(error instanceof Error ? error.message : "Internal server error");
  }
}
