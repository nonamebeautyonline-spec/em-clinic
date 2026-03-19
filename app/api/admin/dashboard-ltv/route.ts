import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

// LTV分析API: 患者あたり累計売上・セグメント別LTVを提供（RPC版）
export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(request);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(request);

    const { data, error } = await supabaseAdmin.rpc("dashboard_ltv_stats", {
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error("[dashboard-ltv] RPC error:", error);
      return serverError(error.message);
    }

    // RPC は jsonb を返すので、そのままレスポンス
    return NextResponse.json(data);
  } catch (error) {
    console.error("[dashboard-ltv] Error:", error);
    return serverError(error instanceof Error ? error.message : "Internal server error");
  }
}
