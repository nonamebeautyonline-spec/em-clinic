// app/api/admin/line/step-scenarios/[id]/route.ts — シナリオ詳細
import { NextRequest, NextResponse } from "next/server";
import { notFound, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id } = await params;

  // シナリオ
  const { data: scenario, error } = await strictWithTenant(
    supabaseAdmin.from("step_scenarios").select("*").eq("id", parseInt(id)),
    tenantId
  ).single();

  if (error || !scenario) return notFound("シナリオが見つかりません");

  // ステップ
  const { data: steps } = await strictWithTenant(
    supabaseAdmin.from("step_items").select("*").eq("scenario_id", parseInt(id)).order("sort_order", { ascending: true }),
    tenantId
  );

  // enrollment 統計
  const { count: activeCount } = await strictWithTenant(
    supabaseAdmin.from("step_enrollments").select("*", { count: "exact", head: true }).eq("scenario_id", parseInt(id)).eq("status", "active"),
    tenantId
  );

  const { count: completedCount } = await strictWithTenant(
    supabaseAdmin.from("step_enrollments").select("*", { count: "exact", head: true }).eq("scenario_id", parseInt(id)).eq("status", "completed"),
    tenantId
  );

  return NextResponse.json({
    scenario,
    steps: steps || [],
    stats: { active: activeCount || 0, completed: completedCount || 0 },
  });
}
