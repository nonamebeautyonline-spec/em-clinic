// AI Case Linking
// 患者ID/メール/電話番号での名寄せ、タスク間リンク管理

import { supabaseAdmin } from "@/lib/supabase";
import type { ChannelType } from "./ai-intake-normalizer";

/**
 * 既存のオープンケースを検索
 * patient_id → email(patients.email) → phone(patients.tel) の優先順で名寄せ
 */
export async function findExistingCase(
  tenantId: string,
  identifiers: { patientId?: string; email?: string; phone?: string }
): Promise<{ caseId: string; status: string } | null> {
  // 1. patient_id で直接検索（最も確実）
  if (identifiers.patientId) {
    const { data } = await supabaseAdmin
      .from("ai_cases")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("patient_id", identifiers.patientId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      return { caseId: data.id, status: data.status };
    }
  }

  // 2. email から patient_id を解決してケース検索
  if (identifiers.email) {
    const patientId = await resolvePatientByEmail(tenantId, identifiers.email);
    if (patientId) {
      const { data } = await supabaseAdmin
        .from("ai_cases")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        return { caseId: data.id, status: data.status };
      }
    }
  }

  // 3. phone から patient_id を解決してケース検索
  if (identifiers.phone) {
    const patientId = await resolvePatientByPhone(tenantId, identifiers.phone);
    if (patientId) {
      const { data } = await supabaseAdmin
        .from("ai_cases")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        return { caseId: data.id, status: data.status };
      }
    }
  }

  return null;
}

/**
 * 新規ケースを作成
 */
export async function createCase(
  tenantId: string,
  patientId: string | null,
  summary?: string
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("ai_cases")
    .insert({
      tenant_id: tenantId,
      patient_id: patientId,
      status: "open",
      summary: summary ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`ケース作成失敗: ${error?.message ?? "不明なエラー"}`);
  }

  return data.id;
}

/**
 * タスクをケースにリンク
 * 重複リンクは UNIQUE 制約で防止（conflict時は何もしない）
 */
export async function linkTaskToCase(
  caseId: string,
  taskId: string,
  channelType: ChannelType
): Promise<void> {
  // タスクの case_id も更新
  await Promise.all([
    supabaseAdmin
      .from("ai_case_links")
      .upsert(
        { case_id: caseId, task_id: taskId, channel_type: channelType },
        { onConflict: "case_id,task_id" }
      ),
    supabaseAdmin
      .from("ai_tasks")
      .update({ case_id: caseId, channel_type: channelType })
      .eq("id", taskId),
  ]);
}

/**
 * ケースに関連するタスク一覧を取得
 */
export async function getCaseRelatedTasks(caseId: string): Promise<
  Array<{
    id: string;
    workflow_type: string;
    channel_type: string;
    status: string;
    created_at: string;
  }>
> {
  const { data, error } = await supabaseAdmin
    .from("ai_case_links")
    .select("task_id")
    .eq("case_id", caseId);

  if (error || !data || data.length === 0) {
    return [];
  }

  const taskIds = data.map((link) => link.task_id);

  // タスク詳細を取得
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from("ai_tasks")
    .select("id, workflow_type, channel_type, status, created_at")
    .in("id", taskIds)
    .order("created_at", { ascending: true });

  if (tasksError || !tasks) {
    return [];
  }

  return tasks.map((t) => ({
    id: t.id,
    workflow_type: t.workflow_type ?? "",
    channel_type: t.channel_type ?? "line",
    status: t.status ?? "",
    created_at: t.created_at,
  }));
}

/**
 * ケースを解決済みにする
 */
export async function resolveCase(caseId: string): Promise<void> {
  await supabaseAdmin
    .from("ai_cases")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);
}

// ============================================================
// 内部ヘルパー: 患者ID解決
// ============================================================

/** メールアドレスから patient_id を解決 */
async function resolvePatientByEmail(
  tenantId: string,
  email: string
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("patients")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email", email)
    .limit(1)
    .single();

  return data?.id ?? null;
}

/** 電話番号から patient_id を解決 */
async function resolvePatientByPhone(
  tenantId: string,
  phone: string
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("patients")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("tel", phone)
    .limit(1)
    .single();

  return data?.id ?? null;
}
