import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { jwtVerify } from "jose";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(sessionCookie, secret);
      return true;
    } catch { /* 次の方式を試す */ }
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    if (authHeader.substring(7) === process.env.ADMIN_TOKEN) return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdminAuth(request))) return unauthorized();
    const tenantId = resolveTenantIdOrThrow(request);

    // RPC関数で全集計をDB側で実行（REST API行数制限の影響なし）
    const { data, error } = await supabaseAdmin.rpc("dashboard_pie_charts", {
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error("[dashboard-pie-charts] RPC error:", error);
      return serverError(error.message);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[dashboard-pie-charts] Error:", error);
    return serverError(error instanceof Error ? error.message : "Internal server error");
  }
}
