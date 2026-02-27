// app/api/admin/line/workflows/route.ts — ワークフロー一覧・新規作成API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { createWorkflowSchema } from "@/lib/validations/line-common";

/**
 * GET: ワークフロー一覧取得（ステップ数・実行回数含む）
 */
export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data: workflows, error } = await withTenant(
    supabaseAdmin
      .from("workflows")
      .select(`
        *,
        workflow_steps(count),
        workflow_executions(count)
      `)
      .order("created_at", { ascending: false }),
    tenantId,
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ステップ数・実行回数を付与
  const enriched = (workflows || []).map((w: any) => ({
    ...w,
    step_count: w.workflow_steps?.[0]?.count || 0,
    execution_count: w.workflow_executions?.[0]?.count || 0,
  }));

  return NextResponse.json({ workflows: enriched });
}

/**
 * POST: ワークフロー新規作成（ステップ一括）
 */
export async function POST(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, createWorkflowSchema);
  if ("error" in parsed) return parsed.error;
  const { name, description, trigger_type, trigger_config, status, steps } = parsed.data;

  // ワークフロー作成
  const { data: workflow, error } = await supabaseAdmin
    .from("workflows")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      description: description || null,
      trigger_type,
      trigger_config: trigger_config || {},
      status: status || "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ステップ一括挿入
  if (Array.isArray(steps) && steps.length > 0) {
    const stepRows = steps.map((s, i) => ({
      workflow_id: workflow.id,
      sort_order: s.sort_order ?? i,
      step_type: s.step_type,
      config: s.config || {},
    }));

    const { error: stepError } = await supabaseAdmin
      .from("workflow_steps")
      .insert(stepRows);

    if (stepError) {
      console.error("[workflows] ステップ挿入エラー:", stepError.message);
    }
  }

  return NextResponse.json({ ok: true, workflow });
}
