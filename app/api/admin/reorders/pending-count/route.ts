import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  const { count, error } = await strictWithTenant(
    supabaseAdmin
      .from("reorders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    tenantId,
  );

  if (error) {
    console.error("[reorders/pending-count] error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ count: count ?? 0 });
}
