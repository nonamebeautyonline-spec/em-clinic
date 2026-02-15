// app/api/admin/line/step-scenarios/[id]/route.ts — シナリオ詳細
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  // シナリオ
  const { data: scenario, error } = await withTenant(
    supabaseAdmin.from("step_scenarios").select("*").eq("id", parseInt(id)),
    tenantId
  ).single();

  if (error || !scenario) return NextResponse.json({ error: "シナリオが見つかりません" }, { status: 404 });

  // ステップ
  const { data: steps } = await withTenant(
    supabaseAdmin.from("step_items").select("*").eq("scenario_id", parseInt(id)).order("sort_order", { ascending: true }),
    tenantId
  );

  // enrollment 統計
  const { count: activeCount } = await withTenant(
    supabaseAdmin.from("step_enrollments").select("*", { count: "exact", head: true }).eq("scenario_id", parseInt(id)).eq("status", "active"),
    tenantId
  );

  const { count: completedCount } = await withTenant(
    supabaseAdmin.from("step_enrollments").select("*", { count: "exact", head: true }).eq("scenario_id", parseInt(id)).eq("status", "completed"),
    tenantId
  );

  return NextResponse.json({
    scenario,
    steps: steps || [],
    stats: { active: activeCount || 0, completed: completedCount || 0 },
  });
}
