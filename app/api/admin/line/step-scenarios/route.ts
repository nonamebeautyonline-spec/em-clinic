// app/api/admin/line/step-scenarios/route.ts — ステップ配信シナリオ CRUD
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { stepScenarioSchema } from "@/lib/validations/line-common";

// シナリオ一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data: scenarios, error } = await withTenant(
    supabaseAdmin.from("step_scenarios").select(`
      *,
      step_items(count),
      trigger_tag:tag_definitions!step_scenarios_trigger_tag_id_fkey(id, name, color)
    `).order("created_at", { ascending: false }),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ステップ数を付与
  const enriched = (scenarios || []).map((s: any) => ({
    ...s,
    step_count: s.step_items?.[0]?.count || 0,
    trigger_tag: s.trigger_tag || null,
  }));

  return NextResponse.json({ scenarios: enriched });
}

// シナリオ新規作成（ステップ一括）
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, stepScenarioSchema);
  if ("error" in parsed) return parsed.error;
  const { name, folder_id, trigger_type, trigger_tag_id, trigger_keyword, trigger_keyword_match, condition_rules, is_enabled, steps } = parsed.data;

  // シナリオ作成
  const { data: scenario, error } = await supabaseAdmin
    .from("step_scenarios")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      folder_id: folder_id || null,
      trigger_type: trigger_type || "follow",
      trigger_tag_id: trigger_tag_id || null,
      trigger_keyword: trigger_keyword || null,
      trigger_keyword_match: trigger_keyword_match || "partial",
      condition_rules: condition_rules || [],
      is_enabled: is_enabled !== false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ステップ一括挿入
  if (Array.isArray(steps) && steps.length > 0) {
    const stepRows = steps.map((s: any, i: number) => ({
      ...tenantPayload(tenantId),
      scenario_id: scenario.id,
      sort_order: i,
      delay_type: s.delay_type || "days",
      delay_value: s.delay_value ?? 1,
      send_time: s.send_time || null,
      step_type: s.step_type || "send_text",
      content: s.content || null,
      template_id: s.template_id || null,
      tag_id: s.tag_id || null,
      mark: s.mark || null,
      menu_id: s.menu_id || null,
      // 条件分岐カラム
      condition_rules: s.condition_rules || [],
      branch_true_step: s.branch_true_step ?? null,
      branch_false_step: s.branch_false_step ?? null,
      exit_condition_rules: s.exit_condition_rules || [],
      exit_action: s.exit_action || "exit",
      exit_jump_to: s.exit_jump_to ?? null,
    }));

    const { error: stepError } = await supabaseAdmin
      .from("step_items")
      .insert(stepRows);

    if (stepError) {
      console.error("[step-scenarios] step insert error:", stepError.message);
    }
  }

  return NextResponse.json({ ok: true, scenario });
}

// シナリオ更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, stepScenarioSchema);
  if ("error" in parsed) return parsed.error;
  const { id, name, folder_id, trigger_type, trigger_tag_id, trigger_keyword, trigger_keyword_match, condition_rules, is_enabled, steps } = parsed.data as any;

  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  const { data: scenario, error } = await withTenant(
    supabaseAdmin.from("step_scenarios").update({
      name: name?.trim() || "",
      folder_id: folder_id || null,
      trigger_type: trigger_type || "follow",
      trigger_tag_id: trigger_tag_id || null,
      trigger_keyword: trigger_keyword || null,
      trigger_keyword_match: trigger_keyword_match || "partial",
      condition_rules: condition_rules || [],
      is_enabled: is_enabled !== false,
      updated_at: new Date().toISOString(),
    }).eq("id", id).select(),
    tenantId
  ).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ステップ: 全削除→再挿入（CASCADE で安全）
  if (Array.isArray(steps)) {
    await withTenant(
      supabaseAdmin.from("step_items").delete().eq("scenario_id", id),
      tenantId
    );

    if (steps.length > 0) {
      const stepRows = steps.map((s: any, i: number) => ({
        ...tenantPayload(tenantId),
        scenario_id: id,
        sort_order: i,
        delay_type: s.delay_type || "days",
        delay_value: s.delay_value ?? 1,
        send_time: s.send_time || null,
        step_type: s.step_type || "send_text",
        content: s.content || null,
        template_id: s.template_id || null,
        tag_id: s.tag_id || null,
        mark: s.mark || null,
        menu_id: s.menu_id || null,
        // 条件分岐カラム
        condition_rules: s.condition_rules || [],
        branch_true_step: s.branch_true_step ?? null,
        branch_false_step: s.branch_false_step ?? null,
        exit_condition_rules: s.exit_condition_rules || [],
        exit_action: s.exit_action || "exit",
        exit_jump_to: s.exit_jump_to ?? null,
      }));

      await supabaseAdmin.from("step_items").insert(stepRows);
    }
  }

  return NextResponse.json({ ok: true, scenario });
}

// シナリオ削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  const { error } = await withTenant(
    supabaseAdmin.from("step_scenarios").delete().eq("id", parseInt(id)),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
