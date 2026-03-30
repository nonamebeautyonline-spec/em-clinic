// AI Workflow Registry
// workflow の登録・取得・一覧を管理するシンプルなMapベースレジストリ

import type { WorkflowConfig } from "./types";

const registry = new Map<string, WorkflowConfig>();

/**
 * workflow を登録（重複登録はエラー）
 */
export function registerWorkflow(config: WorkflowConfig): void {
  if (registry.has(config.id)) {
    throw new Error(`Workflow "${config.id}" は既に登録済み`);
  }
  registry.set(config.id, config);
}

/**
 * workflow を取得（未登録は undefined）
 */
export function getWorkflow(id: string): WorkflowConfig | undefined {
  return registry.get(id);
}

/**
 * workflow を取得（未登録はエラー）
 */
export function getWorkflowOrThrow(id: string): WorkflowConfig {
  const wf = registry.get(id);
  if (!wf) throw new Error(`Workflow "${id}" が見つかりません`);
  return wf;
}

/**
 * 登録済み全 workflow を返す
 */
export function listWorkflows(): WorkflowConfig[] {
  return Array.from(registry.values());
}

/**
 * テスト用: レジストリをクリア
 */
export function clearRegistry(): void {
  registry.clear();
}
