// app/api/admin/line/workflows/[id]/route.ts — ワークフロー個別操作API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateWorkflowSchema } from "@/lib/validations/line-common";
import { executeWorkflow } from "@/lib/workflow-engine";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET: ワークフロー詳細取得（ステップ + 最近の実行ログ）
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await ctx.params;

  // ワークフロー本体 + ステップ取得
  const { data: workflow, error } = await withTenant(
    supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("id", id),
    tenantId,
  ).single();

  if (error || !workflow) {
    return NextResponse.json({ error: "ワークフローが見つかりません" }, { status: 404 });
  }

  // ステップ取得（sort_order昇順）
  const { data: steps } = await supabaseAdmin
    .from("workflow_steps")
    .select("*")
    .eq("workflow_id", id)
    .order("sort_order", { ascending: true });

  // 最近の実行ログ取得（直近20件）
  const { data: executions } = await supabaseAdmin
    .from("workflow_executions")
    .select("*")
    .eq("workflow_id", id)
    .order("started_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    workflow,
    steps: steps || [],
    executions: executions || [],
  });
}

/**
 * PUT: ワークフロー更新（ステータス変更・ステップ更新含む）
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await ctx.params;

  const parsed = await parseBody(req, updateWorkflowSchema);
  if ("error" in parsed) return parsed.error;
  const { name, description, trigger_type, trigger_config, status, steps } = parsed.data;

  // 現在のワークフロー取得
  const { data: existing } = await withTenant(
    supabaseAdmin.from("workflows").select("*").eq("id", id),
    tenantId,
  ).single();

  if (!existing) {
    return NextResponse.json({ error: "ワークフローが見つかりません" }, { status: 404 });
  }

  // ステータス遷移のバリデーション
  if (status && status !== existing.status) {
    const validTransitions: Record<string, string[]> = {
      draft: ["active", "archived"],
      active: ["paused", "archived"],
      paused: ["active", "archived"],
      archived: ["draft"],
    };
    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `ステータスを ${existing.status} から ${status} に変更できません` },
        { status: 400 },
      );
    }
  }

  // 更新データ組み立て
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description;
  if (trigger_type !== undefined) updateData.trigger_type = trigger_type;
  if (trigger_config !== undefined) updateData.trigger_config = trigger_config;
  if (status !== undefined) updateData.status = status;

  const { data: updated, error: updateError } = await withTenant(
    supabaseAdmin.from("workflows").update(updateData).eq("id", id),
    tenantId,
  ).select().single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // ステップ: 全削除→再挿入（CASCADE で安全）
  if (Array.isArray(steps)) {
    await supabaseAdmin
      .from("workflow_steps")
      .delete()
      .eq("workflow_id", id);

    if (steps.length > 0) {
      const stepRows = steps.map((s, i) => ({
        workflow_id: id,
        sort_order: s.sort_order ?? i,
        step_type: s.step_type,
        config: s.config || {},
      }));

      const { error: stepError } = await supabaseAdmin
        .from("workflow_steps")
        .insert(stepRows);

      if (stepError) {
        console.error("[workflows] ステップ更新エラー:", stepError.message);
      }
    }
  }

  // 更新後のワークフロー + ステップを返す
  const { data: resultSteps } = await supabaseAdmin
    .from("workflow_steps")
    .select("*")
    .eq("workflow_id", id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    ok: true,
    workflow: updated,
    steps: resultSteps || [],
  });
}

/**
 * DELETE: ワークフロー削除
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await ctx.params;

  // アクティブなワークフローは削除不可
  const { data: existing } = await withTenant(
    supabaseAdmin.from("workflows").select("status").eq("id", id),
    tenantId,
  ).single();

  if (!existing) {
    return NextResponse.json({ error: "ワークフローが見つかりません" }, { status: 404 });
  }
  if (existing.status === "active") {
    return NextResponse.json(
      { error: "有効なワークフローは削除できません。先に一時停止またはアーカイブしてください。" },
      { status: 400 },
    );
  }

  // CASCADE で workflow_steps も削除される
  const { error } = await withTenant(
    supabaseAdmin.from("workflows").delete().eq("id", id),
    tenantId,
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * POST: ワークフロー手動実行
 * bodyに { patient_id, line_user_id, patient_name } を含める
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await ctx.params;

  let body: Record<string, any> = {};
  try {
    body = await req.json();
  } catch {
    // bodyなしでもOK
  }

  const result = await executeWorkflow(id, {
    patient_id: body.patient_id,
    line_user_id: body.line_user_id,
    patient_name: body.patient_name,
  }, tenantId);

  return NextResponse.json({ ok: true, result });
}
