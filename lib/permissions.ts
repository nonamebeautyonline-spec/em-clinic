// lib/permissions.ts — 細粒度権限管理
// 4段階ロール: owner > admin > editor > viewer

// 権限定義
export type Permission =
  | "dashboard.view"
  | "patients.view" | "patients.edit"
  | "karte.view" | "karte.edit"
  | "reservations.view" | "reservations.edit"
  | "shipping.view" | "shipping.edit"
  | "billing.view" | "billing.edit"
  | "settings.view" | "settings.edit"
  | "members.view" | "members.edit"
  | "analytics.view" | "analytics.export"
  | "friends.view" | "friends.edit"
  | "broadcast.view" | "broadcast.send"
  | "richmenu.view" | "richmenu.edit"
  | "ai_reply.view" | "ai_reply.edit";

// 各ロールの権限一覧
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // オーナー: 全権限
  owner: [
    "dashboard.view",
    "patients.view", "patients.edit",
    "karte.view", "karte.edit",
    "reservations.view", "reservations.edit",
    "shipping.view", "shipping.edit",
    "billing.view", "billing.edit",
    "settings.view", "settings.edit",
    "members.view", "members.edit",
    "analytics.view", "analytics.export",
    "friends.view", "friends.edit",
    "broadcast.view", "broadcast.send",
    "richmenu.view", "richmenu.edit",
    "ai_reply.view", "ai_reply.edit",
  ],

  // 管理者: メンバー管理以外は全権限
  admin: [
    "dashboard.view",
    "patients.view", "patients.edit",
    "karte.view", "karte.edit",
    "reservations.view", "reservations.edit",
    "shipping.view", "shipping.edit",
    "billing.view", "billing.edit",
    "settings.view", "settings.edit",
    "members.view",
    "analytics.view", "analytics.export",
    "friends.view", "friends.edit",
    "broadcast.view", "broadcast.send",
    "richmenu.view", "richmenu.edit",
    "ai_reply.view", "ai_reply.edit",
  ],

  // 編集者: 設定・メンバー管理以外の閲覧・編集
  editor: [
    "dashboard.view",
    "patients.view", "patients.edit",
    "karte.view", "karte.edit",
    "reservations.view", "reservations.edit",
    "shipping.view", "shipping.edit",
    "billing.view",
    "analytics.view",
    "friends.view", "friends.edit",
    "broadcast.view", "broadcast.send",
    "richmenu.view",
    "ai_reply.view",
  ],

  // 閲覧者: 閲覧のみ
  viewer: [
    "dashboard.view",
    "patients.view",
    "karte.view",
    "reservations.view",
    "shipping.view",
    "billing.view",
    "analytics.view",
    "friends.view",
    "broadcast.view",
    "richmenu.view",
    "ai_reply.view",
  ],
};

/**
 * ロールが指定された権限を持つかチェック
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

// APIパスと権限のマッピングルール
// パスのプレフィックスとHTTPメソッドで必要な権限を決定
interface PathRule {
  prefix: string;
  viewPermission: Permission;
  editPermission: Permission;
}

const PATH_RULES: PathRule[] = [
  // LINE機能
  { prefix: "/api/admin/line/broadcast", viewPermission: "broadcast.view", editPermission: "broadcast.send" },
  { prefix: "/api/admin/line/richmenu", viewPermission: "richmenu.view", editPermission: "richmenu.edit" },
  { prefix: "/api/admin/line", viewPermission: "friends.view", editPermission: "friends.edit" },
  { prefix: "/api/admin/ai-reply", viewPermission: "ai_reply.view", editPermission: "ai_reply.edit" },
  // カルテ
  { prefix: "/api/admin/karte", viewPermission: "karte.view", editPermission: "karte.edit" },
  { prefix: "/api/admin/patientnote", viewPermission: "karte.view", editPermission: "karte.edit" },
  { prefix: "/api/admin/doctors", viewPermission: "karte.view", editPermission: "karte.edit" },
  // 予約
  { prefix: "/api/admin/reservations", viewPermission: "reservations.view", editPermission: "reservations.edit" },
  { prefix: "/api/admin/weekly_rules", viewPermission: "reservations.view", editPermission: "reservations.edit" },
  { prefix: "/api/admin/date_override", viewPermission: "reservations.view", editPermission: "reservations.edit" },
  { prefix: "/api/admin/booking-open", viewPermission: "reservations.view", editPermission: "reservations.edit" },
  { prefix: "/api/admin/schedule", viewPermission: "reservations.view", editPermission: "reservations.edit" },
  // 患者
  { prefix: "/api/admin/patients", viewPermission: "patients.view", editPermission: "patients.edit" },
  { prefix: "/api/admin/patient-name-change", viewPermission: "patients.view", editPermission: "patients.edit" },
  { prefix: "/api/admin/patient-data", viewPermission: "patients.view", editPermission: "patients.edit" },
  { prefix: "/api/admin/delete-patient-data", viewPermission: "patients.view", editPermission: "patients.edit" },
  { prefix: "/api/admin/merge-patients", viewPermission: "patients.view", editPermission: "patients.edit" },
  { prefix: "/api/admin/update-line-user-id", viewPermission: "patients.view", editPermission: "patients.edit" },
  { prefix: "/api/admin/dedup", viewPermission: "patients.view", editPermission: "patients.edit" },
  { prefix: "/api/admin/tags", viewPermission: "patients.view", editPermission: "patients.edit" },
  { prefix: "/api/admin/friend-fields", viewPermission: "friends.view", editPermission: "friends.edit" },
  // 発送
  { prefix: "/api/admin/shipping", viewPermission: "shipping.view", editPermission: "shipping.edit" },
  { prefix: "/api/admin/inventory", viewPermission: "shipping.view", editPermission: "shipping.edit" },
  // 決済
  { prefix: "/api/admin/reorders", viewPermission: "billing.view", editPermission: "billing.edit" },
  { prefix: "/api/admin/bank-transfer", viewPermission: "billing.view", editPermission: "billing.edit" },
  { prefix: "/api/admin/refunds", viewPermission: "billing.view", editPermission: "billing.edit" },
  { prefix: "/api/admin/products", viewPermission: "billing.view", editPermission: "billing.edit" },
  { prefix: "/api/admin/financials", viewPermission: "billing.view", editPermission: "billing.edit" },
  // 設定
  { prefix: "/api/admin/settings", viewPermission: "settings.view", editPermission: "settings.edit" },
  { prefix: "/api/admin/flex-settings", viewPermission: "settings.view", editPermission: "settings.edit" },
  { prefix: "/api/admin/mypage-settings", viewPermission: "settings.view", editPermission: "settings.edit" },
  // メンバー管理
  { prefix: "/api/admin/users", viewPermission: "members.view", editPermission: "members.edit" },
  // 分析
  { prefix: "/api/admin/analytics", viewPermission: "analytics.view", editPermission: "analytics.export" },
];

// 権限チェックを除外するパス（認証系・セッション系）
const PERMISSION_EXEMPT_PATHS = [
  "/api/admin/login",
  "/api/admin/logout",
  "/api/admin/session",
  "/api/admin/chat-reads",
  "/api/admin/account",
  "/api/admin/unread-count",
  "/api/admin/invalidate-cache",
  "/api/admin/pins",
  "/api/admin/patientbundle",
  "/api/admin/intake-form",
  "/api/admin/view-mypage",
];

/**
 * APIパスとHTTPメソッドから必要な権限を解決
 * 除外パスや未定義パスの場合は null を返す（チェック不要）
 */
export function getRequiredPermission(
  path: string,
  method: string,
): Permission | null {
  // 除外パスはチェック不要
  if (PERMISSION_EXEMPT_PATHS.some((p) => path.startsWith(p))) {
    return null;
  }

  // admin API以外はチェック不要
  if (!path.startsWith("/api/admin/")) {
    return null;
  }

  // パスルールに一致するものを探す（長いプレフィックスが先にマッチ）
  const rule = PATH_RULES.find((r) => path.startsWith(r.prefix));
  if (!rule) {
    // ダッシュボードやその他のGET
    if (method === "GET") return "dashboard.view";
    return null;
  }

  // GETは閲覧権限、それ以外は編集権限
  if (method === "GET") {
    return rule.viewPermission;
  }
  return rule.editPermission;
}
