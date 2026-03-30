// AI設定バージョン管理（Phase 3）
// 設定のスナップショット保存、履歴参照、ロールバック、差分検出

import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";

// ---------- 型定義 ----------

export interface ConfigVersion {
  id: number;
  tenant_id: string | null;
  config_type: string;
  config_snapshot: Record<string, unknown>;
  version_number: number;
  created_by: string | null;
  created_at: string;
}

export interface ConfigDiff {
  added: Record<string, unknown>;
  changed: Record<string, { before: unknown; after: unknown }>;
  removed: Record<string, unknown>;
}

// ---------- バージョン保存 ----------

/**
 * 新バージョンを保存（version_numberは自動インクリメント）
 */
export async function saveConfigVersion(
  tenantId: string | null,
  configType: string,
  snapshot: Record<string, unknown>,
  createdBy: string
): Promise<ConfigVersion> {
  // 現在の最大version_numberを取得
  let query = supabaseAdmin
    .from("ai_config_versions")
    .select("version_number")
    .eq("config_type", configType)
    .order("version_number", { ascending: false })
    .limit(1);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  } else {
    query = query.is("tenant_id", null);
  }

  const { data: existing } = await query;
  const nextVersion = existing && existing.length > 0
    ? (existing[0].version_number as number) + 1
    : 1;

  const payload = {
    ...tenantPayload(tenantId),
    config_type: configType,
    config_snapshot: snapshot,
    version_number: nextVersion,
    created_by: createdBy,
  };

  const { data, error } = await supabaseAdmin
    .from("ai_config_versions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[ConfigVersioning] 保存エラー:", error);
    throw new Error(`バージョン保存に失敗しました: ${error.message}`);
  }

  // 監査ログ保存
  await supabaseAdmin.from("ai_config_audit_logs").insert({
    ...tenantPayload(tenantId),
    config_type: configType,
    action: "version_saved",
    after_value: snapshot,
    actor: createdBy,
  });

  return data as ConfigVersion;
}

// ---------- バージョン一覧 ----------

/**
 * バージョン一覧を取得（新しい順）
 */
export async function getConfigVersions(
  tenantId: string | null,
  configType: string,
  limit: number = 20
): Promise<ConfigVersion[]> {
  let query = supabaseAdmin
    .from("ai_config_versions")
    .select("*")
    .eq("config_type", configType)
    .order("version_number", { ascending: false })
    .limit(limit);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  } else {
    query = query.is("tenant_id", null);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[ConfigVersioning] 一覧取得エラー:", error);
    return [];
  }

  return (data || []) as ConfigVersion[];
}

// ---------- 特定バージョン取得 ----------

/**
 * 特定バージョンを取得
 */
export async function getConfigVersion(
  tenantId: string | null,
  configType: string,
  versionNumber: number
): Promise<ConfigVersion | null> {
  let query = supabaseAdmin
    .from("ai_config_versions")
    .select("*")
    .eq("config_type", configType)
    .eq("version_number", versionNumber)
    .limit(1);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  } else {
    query = query.is("tenant_id", null);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) return null;

  return data[0] as ConfigVersion;
}

// ---------- ロールバック ----------

/**
 * 指定バージョンに復元（新バージョンとして保存）
 */
export async function rollbackConfig(
  tenantId: string | null,
  configType: string,
  targetVersion: number,
  actor: string
): Promise<ConfigVersion> {
  const target = await getConfigVersion(tenantId, configType, targetVersion);
  if (!target) {
    throw new Error(`バージョン ${targetVersion} が見つかりません`);
  }

  // 現在の最新を取得（差分記録用）
  const versions = await getConfigVersions(tenantId, configType, 1);
  const currentSnapshot = versions.length > 0 ? versions[0].config_snapshot : {};

  // 新バージョンとして保存
  const restored = await saveConfigVersion(
    tenantId,
    configType,
    target.config_snapshot,
    actor
  );

  // ロールバック監査ログ
  await supabaseAdmin.from("ai_config_audit_logs").insert({
    ...tenantPayload(tenantId),
    config_type: configType,
    action: "rollback",
    before_value: currentSnapshot,
    after_value: target.config_snapshot,
    actor,
  });

  return restored;
}

// ---------- 差分検出 ----------

/**
 * 2つのJSONオブジェクトの差分を生成
 */
export function diffConfigs(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): ConfigDiff {
  const added: Record<string, unknown> = {};
  const changed: Record<string, { before: unknown; after: unknown }> = {};
  const removed: Record<string, unknown> = {};

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const inBefore = key in before;
    const inAfter = key in after;

    if (!inBefore && inAfter) {
      // 追加されたキー
      added[key] = after[key];
    } else if (inBefore && !inAfter) {
      // 削除されたキー
      removed[key] = before[key];
    } else if (inBefore && inAfter) {
      // 変更チェック（deep比較）
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changed[key] = { before: before[key], after: after[key] };
      }
    }
  }

  return { added, changed, removed };
}
