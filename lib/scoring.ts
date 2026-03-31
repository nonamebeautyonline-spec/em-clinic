// lib/scoring.ts — リードスコアリング
//
// イベントベースの自動スコア加点。イベントバスのサブスクライバーとして動作。
// patients.lead_score にキャッシュし、patient_scores に履歴を記録。
//
// 使い方:
//   スコアリングルール作成 → イベント発生 → processScoring() が自動実行
//   手動加点: await addScore({ patientId, scoreChange: 10, reason: "手動" }, tenantId)

import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant, tenantPayload } from "@/lib/tenant";
import type { EventType, EventPayload } from "@/lib/event-bus";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export interface ScoringRule {
  id: string;
  name: string;
  event_type: string;
  score_value: number;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
}

export interface PatientScoreEntry {
  id: string;
  patient_id: string;
  scoring_rule_id: string | null;
  score_change: number;
  reason: string | null;
  tenant_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// スコアリングルール CRUD
// ---------------------------------------------------------------------------

export async function getScoringRules(tenantId: string): Promise<ScoringRule[]> {
  const { data } = await strictWithTenant(
    supabaseAdmin.from("scoring_rules").select("*").order("created_at", { ascending: false }),
    tenantId,
  );
  return (data ?? []) as ScoringRule[];
}

export async function createScoringRule(
  input: { name: string; eventType: string; scoreValue: number },
  tenantId: string,
): Promise<ScoringRule> {
  const { data, error } = await supabaseAdmin
    .from("scoring_rules")
    .insert({
      ...tenantPayload(tenantId),
      name: input.name,
      event_type: input.eventType,
      score_value: input.scoreValue,
    })
    .select()
    .single();
  if (error) throw new Error(`スコアリングルール作成失敗: ${error.message}`);
  return data as ScoringRule;
}

export async function updateScoringRule(
  id: string,
  updates: Partial<{ name: string; eventType: string; scoreValue: number; isActive: boolean }>,
  tenantId: string,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.eventType !== undefined) payload.event_type = updates.eventType;
  if (updates.scoreValue !== undefined) payload.score_value = updates.scoreValue;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;

  if (Object.keys(payload).length === 0) return;

  await strictWithTenant(
    supabaseAdmin.from("scoring_rules").update(payload).eq("id", id),
    tenantId,
  );
}

export async function deleteScoringRule(id: string, tenantId: string): Promise<void> {
  await strictWithTenant(
    supabaseAdmin.from("scoring_rules").delete().eq("id", id),
    tenantId,
  );
}

// ---------------------------------------------------------------------------
// スコア加算
// ---------------------------------------------------------------------------

/** スコアを加算し、patients.lead_score キャッシュを更新 */
export async function addScore(
  input: {
    patientId: string;
    scoreChange: number;
    scoringRuleId?: string;
    reason?: string;
  },
  tenantId: string,
): Promise<void> {
  // 履歴記録
  await supabaseAdmin.from("patient_scores").insert({
    ...tenantPayload(tenantId),
    patient_id: input.patientId,
    scoring_rule_id: input.scoringRuleId ?? null,
    score_change: input.scoreChange,
    reason: input.reason ?? null,
  });

  // lead_score キャッシュ更新（RPC でアトミックに加算）
  // RPCが未作成の場合はフォールバック
  const { error } = await supabaseAdmin.rpc("increment_lead_score", {
    p_patient_id: input.patientId,
    p_delta: input.scoreChange,
    p_tenant_id: tenantId,
  });

  if (error) {
    // RPC未作成時のフォールバック: 現在値を取得して更新
    const { data: current } = await strictWithTenant(
      supabaseAdmin
        .from("patients")
        .select("lead_score")
        .eq("patient_id", input.patientId)
        .maybeSingle(),
      tenantId,
    );
    const newScore = ((current?.lead_score as number) ?? 0) + input.scoreChange;
    await strictWithTenant(
      supabaseAdmin
        .from("patients")
        .update({ lead_score: newScore })
        .eq("patient_id", input.patientId),
      tenantId,
    );
  }
}

// ---------------------------------------------------------------------------
// スコア取得
// ---------------------------------------------------------------------------

export async function getPatientScore(patientId: string, tenantId: string): Promise<number> {
  const { data } = await strictWithTenant(
    supabaseAdmin
      .from("patients")
      .select("lead_score")
      .eq("patient_id", patientId)
      .maybeSingle(),
    tenantId,
  );
  return (data?.lead_score as number) ?? 0;
}

export async function getScoreHistory(
  patientId: string,
  tenantId: string,
): Promise<PatientScoreEntry[]> {
  const { data } = await strictWithTenant(
    supabaseAdmin
      .from("patient_scores")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(100),
    tenantId,
  );
  return (data ?? []) as PatientScoreEntry[];
}

// ---------------------------------------------------------------------------
// イベントバスサブスクライバー
// ---------------------------------------------------------------------------

/**
 * イベント発生時にアクティブなスコアリングルールを自動適用する。
 * registerSubscriber(processScoring) で登録して使う。
 */
export async function processScoring(
  type: EventType,
  payload: EventPayload,
): Promise<void> {
  if (!payload.patientId || !payload.tenantId) return;

  // このイベントタイプに対応するアクティブルールを取得
  const { data: rules } = await strictWithTenant(
    supabaseAdmin
      .from("scoring_rules")
      .select("*")
      .eq("event_type", type)
      .eq("is_active", true),
    payload.tenantId,
  );

  if (!rules || rules.length === 0) return;

  for (const rule of rules) {
    const r = rule as ScoringRule;
    await addScore(
      {
        patientId: payload.patientId,
        scoreChange: r.score_value,
        scoringRuleId: r.id,
        reason: `${type} → ${r.name}`,
      },
      payload.tenantId,
    );
  }
}
