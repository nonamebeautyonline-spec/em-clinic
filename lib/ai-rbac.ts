// AI機能のロール定義と権限チェック（Phase 3）
// 現時点ではverifyPlatformAdminのplatform_adminチェックのみで運用
// AI Roleは将来の拡張用に定義・チェック関数のみ実装

// ---------- 型定義 ----------

export type AIRole =
  | "ai_viewer"
  | "ai_operator"
  | "ai_config_editor"
  | "ai_approver"
  | "ai_admin";

export type AIPermission =
  | "tasks:view"
  | "metrics:view"
  | "feedback:add"
  | "tasks:assign"
  | "policy:edit"
  | "config:change_request"
  | "config:approve"
  | "config:reject"
  | "eval:create"
  | "eval:view"
  | "config:rollback"
  | "system:admin";

// ---------- 権限マトリクス ----------

const PERMISSION_MATRIX: Record<AIRole, AIPermission[]> = {
  ai_viewer: [
    "tasks:view",
    "metrics:view",
    "eval:view",
  ],
  ai_operator: [
    "tasks:view",
    "metrics:view",
    "eval:view",
    "feedback:add",
    "tasks:assign",
  ],
  ai_config_editor: [
    "tasks:view",
    "metrics:view",
    "eval:view",
    "feedback:add",
    "tasks:assign",
    "policy:edit",
    "config:change_request",
    "eval:create",
  ],
  ai_approver: [
    "tasks:view",
    "metrics:view",
    "eval:view",
    "feedback:add",
    "tasks:assign",
    "policy:edit",
    "config:change_request",
    "config:approve",
    "config:reject",
    "eval:create",
  ],
  ai_admin: [
    "tasks:view",
    "metrics:view",
    "eval:view",
    "feedback:add",
    "tasks:assign",
    "policy:edit",
    "config:change_request",
    "config:approve",
    "config:reject",
    "eval:create",
    "config:rollback",
    "system:admin",
  ],
};

// ---------- 権限チェック ----------

/**
 * 指定ロールが指定アクションの権限を持つかチェック
 */
export function checkAIPermission(
  userRole: AIRole,
  action: string
): boolean {
  const permissions = PERMISSION_MATRIX[userRole];
  if (!permissions) return false;
  return permissions.includes(action as AIPermission);
}

/**
 * 指定ロールの全権限を取得
 */
export function getAIPermissions(role: AIRole): string[] {
  return PERMISSION_MATRIX[role] || [];
}

/**
 * ロールの階層レベルを取得（数値が大きいほど上位）
 */
export function getAIRoleLevel(role: AIRole): number {
  switch (role) {
    case "ai_viewer": return 1;
    case "ai_operator": return 2;
    case "ai_config_editor": return 3;
    case "ai_approver": return 4;
    case "ai_admin": return 5;
    default: return 0;
  }
}

/**
 * 全ロール一覧（UI表示用）
 */
export function listAIRoles(): Array<{ role: AIRole; label: string; level: number }> {
  return [
    { role: "ai_viewer", label: "閲覧者", level: 1 },
    { role: "ai_operator", label: "オペレーター", level: 2 },
    { role: "ai_config_editor", label: "設定編集者", level: 3 },
    { role: "ai_approver", label: "承認者", level: 4 },
    { role: "ai_admin", label: "管理者", level: 5 },
  ];
}
