// lib/tenant-lifecycle.ts
// テナントライフサイクル状態の導出と遷移ルール

/**
 * テナントのライフサイクル状態
 * trial → active → grace → suspended → churned
 * 各状態は既存のDBカラムから導出する
 */
export type LifecycleStatus =
  | "trial"       // トライアル期間中
  | "active"      // 通常稼働
  | "grace"       // 猶予期間（支払い失敗後14日以内）
  | "suspended"   // サスペンド（支払い滞納または手動停止）
  | "churned";    // 解約済み（ソフトデリート）

export interface LifecycleInfo {
  status: LifecycleStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

/**
 * テナントのDBレコードからライフサイクル状態を導出
 */
export function deriveLifecycleStatus(tenant: {
  is_active: boolean;
  deleted_at?: string | null;
  suspended_at?: string | null;
  suspend_reason?: string | null;
  created_at: string;
}, plan?: {
  status?: string | null;
  plan_name?: string | null;
  payment_failed_at?: string | null;
  started_at?: string | null;
} | null): LifecycleStatus {
  // 解約済み
  if (tenant.deleted_at) return "churned";

  // サスペンド
  if (!tenant.is_active && tenant.suspended_at) return "suspended";

  // 猶予期間（支払い失敗中だがまだサスペンドされていない）
  if (plan?.status === "payment_failed" && tenant.is_active) return "grace";

  // トライアル
  if (plan?.plan_name === "trial" || plan?.status === "trial") return "trial";

  // 有効でないがサスペンドでもない場合（手動無効化）
  if (!tenant.is_active) return "suspended";

  // 通常稼働
  return "active";
}

/**
 * ライフサイクル状態の表示情報を取得
 */
export function getLifecycleInfo(status: LifecycleStatus): LifecycleInfo {
  switch (status) {
    case "trial":
      return {
        status: "trial",
        label: "トライアル",
        color: "text-blue-700",
        bgColor: "bg-blue-100",
        borderColor: "border-blue-200",
        description: "無料トライアル期間中です",
      };
    case "active":
      return {
        status: "active",
        label: "稼働中",
        color: "text-green-700",
        bgColor: "bg-green-100",
        borderColor: "border-green-200",
        description: "正常に稼働しています",
      };
    case "grace":
      return {
        status: "grace",
        label: "猶予期間",
        color: "text-orange-700",
        bgColor: "bg-orange-100",
        borderColor: "border-orange-200",
        description: "支払い失敗のため猶予期間中です。14日以内に支払いが確認されない場合、サスペンドされます",
      };
    case "suspended":
      return {
        status: "suspended",
        label: "停止中",
        color: "text-red-700",
        bgColor: "bg-red-100",
        borderColor: "border-red-200",
        description: "テナントは停止されています。再開するにはプラットフォーム管理者の操作が必要です",
      };
    case "churned":
      return {
        status: "churned",
        label: "解約済み",
        color: "text-slate-700",
        bgColor: "bg-slate-100",
        borderColor: "border-slate-200",
        description: "テナントは解約されています。復元する場合はリストア操作を行ってください",
      };
  }
}

/**
 * 許可される状態遷移を取得
 */
export function getAllowedTransitions(current: LifecycleStatus): LifecycleStatus[] {
  switch (current) {
    case "trial":
      return ["active", "suspended", "churned"];
    case "active":
      return ["suspended", "churned"];
    case "grace":
      return ["active", "suspended", "churned"];
    case "suspended":
      return ["active", "churned"];
    case "churned":
      return ["active"]; // リストアで復元可能
  }
}
