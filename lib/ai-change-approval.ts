// AI設定変更承認フロー（Phase 3）
// 変更リクエスト作成 → レビュー（承認/却下） → 適用

import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";

// ---------- 型定義 ----------

export interface ChangeRequest {
  id: number;
  tenant_id: string | null;
  config_type: string;
  change_description: string;
  diff: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "applied";
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  applied_at: string | null;
  created_at: string;
}

// ---------- 変更リクエスト作成 ----------

/**
 * 変更リクエストを作成
 */
export async function createChangeRequest(
  tenantId: string | null,
  configType: string,
  description: string,
  diff: Record<string, unknown>,
  requestedBy: string
): Promise<ChangeRequest> {
  const payload = {
    ...tenantPayload(tenantId),
    config_type: configType,
    change_description: description,
    diff,
    status: "pending",
    requested_by: requestedBy,
  };

  const { data, error } = await supabaseAdmin
    .from("ai_config_change_requests")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[ChangeApproval] 作成エラー:", error);
    throw new Error(`変更リクエスト作成に失敗しました: ${error.message}`);
  }

  // 監査ログ
  await supabaseAdmin.from("ai_config_audit_logs").insert({
    ...tenantPayload(tenantId),
    config_type: configType,
    action: "change_requested",
    after_value: diff,
    actor: requestedBy,
  });

  return data as ChangeRequest;
}

// ---------- 一覧取得 ----------

/**
 * 変更リクエスト一覧を取得
 */
export async function listChangeRequests(
  status?: string,
  limit: number = 50
): Promise<ChangeRequest[]> {
  let query = supabaseAdmin
    .from("ai_config_change_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[ChangeApproval] 一覧取得エラー:", error);
    return [];
  }

  return (data || []) as ChangeRequest[];
}

// ---------- 承認 ----------

/**
 * 変更リクエストを承認
 */
export async function approveChangeRequest(
  requestId: number,
  reviewedBy: string
): Promise<ChangeRequest> {
  const { data, error } = await supabaseAdmin
    .from("ai_config_change_requests")
    .update({
      status: "approved",
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    console.error("[ChangeApproval] 承認エラー:", error);
    throw new Error(`承認に失敗しました: ${error.message}`);
  }

  // 監査ログ
  await supabaseAdmin.from("ai_config_audit_logs").insert({
    ...tenantPayload(data.tenant_id),
    config_type: data.config_type,
    action: "change_approved",
    after_value: { request_id: requestId },
    actor: reviewedBy,
  });

  return data as ChangeRequest;
}

// ---------- 却下 ----------

/**
 * 変更リクエストを却下
 */
export async function rejectChangeRequest(
  requestId: number,
  reviewedBy: string
): Promise<ChangeRequest> {
  const { data, error } = await supabaseAdmin
    .from("ai_config_change_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    console.error("[ChangeApproval] 却下エラー:", error);
    throw new Error(`却下に失敗しました: ${error.message}`);
  }

  // 監査ログ
  await supabaseAdmin.from("ai_config_audit_logs").insert({
    ...tenantPayload(data.tenant_id),
    config_type: data.config_type,
    action: "change_rejected",
    after_value: { request_id: requestId },
    actor: reviewedBy,
  });

  return data as ChangeRequest;
}

// ---------- 適用 ----------

/**
 * 承認済みリクエストを適用
 */
export async function applyChangeRequest(
  requestId: number
): Promise<ChangeRequest> {
  const { data, error } = await supabaseAdmin
    .from("ai_config_change_requests")
    .update({
      status: "applied",
      applied_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "approved")
    .select()
    .single();

  if (error) {
    console.error("[ChangeApproval] 適用エラー:", error);
    throw new Error(`適用に失敗しました: ${error.message}`);
  }

  return data as ChangeRequest;
}
