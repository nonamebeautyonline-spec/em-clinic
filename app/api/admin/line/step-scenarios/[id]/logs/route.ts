import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant, resolveTenantIdOrThrow } from "@/lib/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) return unauthorized();

  try {
    const { id } = await params;
    const scenarioId = parseInt(id);
    const tenantId = resolveTenantIdOrThrow(request);

    const url = new URL(request.url);
    const enrollmentId = url.searchParams.get("enrollment_id");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);

    let query = strictWithTenant(
      supabaseAdmin
        .from("step_execution_logs")
        .select("*")
        .eq("scenario_id", scenarioId)
        .order("executed_at", { ascending: false })
        .limit(limit),
      tenantId,
    );

    if (enrollmentId) {
      query = query.eq("enrollment_id", parseInt(enrollmentId));
    }

    const { data, error } = await query;
    if (error) return serverError(error.message);

    return NextResponse.json({ logs: data || [] });
  } catch (e) {
    return serverError((e as Error).message);
  }
}
