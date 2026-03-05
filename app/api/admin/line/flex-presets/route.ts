// app/api/admin/line/flex-presets/route.ts — Flexプリセット一覧
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("flex_presets")
      .select("*")
      .order("sort_order", { ascending: true }),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ presets: data });
}
