// app/api/admin/line/followup-rules/route.ts — フォローアップルール一覧取得・作成API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { createFollowupRuleSchema } from "@/lib/validations/followup";

/**
 * GET: フォローアップルール一覧取得
 */
export async function GET(req: NextRequest) {
  if (!(await verifyAdminAuth(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  let query = supabaseAdmin
    .from("followup_rules")
    .select("*")
    .order("delay_days", { ascending: true });
  query = withTenant(query, tenantId);

  const { data: rules, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 各ルールの直近10件の送信ログも取得
  const ruleIds = (rules || []).map((r) => r.id);
  let logs: Record<string, unknown>[] = [];
  if (ruleIds.length > 0) {
    const { data: logData } = await supabaseAdmin
      .from("followup_logs")
      .select("id, rule_id, patient_id, scheduled_at, sent_at, status, error_message")
      .in("rule_id", ruleIds)
      .order("created_at", { ascending: false })
      .limit(50);
    logs = logData || [];
  }

  // ルールごとにログをグループ化（各ルール最大10件）
  const logsByRule: Record<number, typeof logs> = {};
  for (const log of logs) {
    const ruleId = log.rule_id as number;
    if (!logsByRule[ruleId]) logsByRule[ruleId] = [];
    if (logsByRule[ruleId].length < 10) {
      logsByRule[ruleId].push(log);
    }
  }

  const rulesWithLogs = (rules || []).map((rule) => ({
    ...rule,
    recent_logs: logsByRule[rule.id] || [],
  }));

  return NextResponse.json({ rules: rulesWithLogs });
}

/**
 * POST: フォローアップルール作成
 */
export async function POST(req: NextRequest) {
  if (!(await verifyAdminAuth(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const { data, error: parseError } = await parseBody(req, createFollowupRuleSchema);
  if (parseError) return parseError;

  const { error } = await supabaseAdmin
    .from("followup_rules")
    .insert({
      ...tenantPayload(tenantId),
      name: data.name,
      trigger_event: data.trigger_event,
      delay_days: data.delay_days,
      message_template: data.message_template,
      flex_json: data.flex_json || null,
      is_enabled: data.is_enabled ?? true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
