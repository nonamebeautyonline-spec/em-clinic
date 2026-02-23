"use client";

import { useState, useEffect, useCallback } from "react";

// ===== 型定義 =====
type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type Plan = {
  id: string;
  tenant_id: string;
  plan_name: string;
  monthly_fee: number;
  setup_fee: number;
  started_at: string | null;
  next_billing_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenants: TenantInfo | null;
};

type Invoice = {
  id: string;
  tenant_id: string;
  plan_id: string | null;
  amount: number;
  tax_amount: number;
  billing_period_start: string;
  billing_period_end: string;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenants: TenantInfo | null;
};

type KPI = {
  totalBilled: number;
  totalPending: number;
  totalPaid: number;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ===== 定数 =====
const PLAN_LABELS: Record<string, string> = {
  trial: "トライアル",
  standard: "スタンダード",
  premium: "プレミアム",
  enterprise: "エンタープライズ",
  light: "ライト",
  pro: "プロ",
  business: "ビジネス",
  business_30: "ビジネス30万",
  business_50: "ビジネス50万",
  business_100: "ビジネス100万",
};

const PLAN_BADGE_COLORS: Record<string, string> = {
  trial: "bg-gray-100 text-gray-700",
  standard: "bg-blue-100 text-blue-700",
  premium: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
  light: "bg-slate-100 text-slate-700",
  pro: "bg-indigo-100 text-indigo-700",
  business: "bg-purple-100 text-purple-700",
  business_30: "bg-emerald-100 text-emerald-700",
  business_50: "bg-teal-100 text-teal-700",
  business_100: "bg-amber-100 text-amber-700",
};

const PLAN_STATUS_LABELS: Record<string, string> = {
  active: "有効",
  suspended: "停止中",
  cancelled: "解約済み",
};

const PLAN_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-amber-100 text-amber-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: "未払い",
  paid: "入金済み",
  overdue: "延滞",
  cancelled: "キャンセル",
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const MONTHLY_FEE_PRESETS: Record<string, number> = {
  trial: 0,
  light: 4000,
  standard: 17000,
  pro: 26000,
  business: 70000,
  business_30: 105000,
  business_50: 115000,
  business_100: 158000,
  premium: 80000,
  enterprise: 150000,
};

// ===== ヘルパー関数 =====
const formatYen = (amount: number) =>
  `¥${new Intl.NumberFormat("ja-JP").format(amount)}`;

const formatDate = (isoString: string | null) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatDateTime = (isoString: string | null) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ===== メインコンポーネント =====
export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<
    "plans" | "invoices" | "usage"
  >("plans");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // トースト自動消去
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* トースト通知 */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white transition-all ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">契約・請求管理</h1>
        <p className="text-slate-600 text-sm mt-1">
          テナントのプラン管理と請求書発行を一元管理
        </p>
      </div>

      {/* タブ切替 */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "plans"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          プラン管理
        </button>
        <button
          onClick={() => setActiveTab("usage")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "usage"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          使用量
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "invoices"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          請求書
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === "plans" ? (
        <PlansTab showToast={(msg, type) => setToast({ message: msg, type })} />
      ) : activeTab === "usage" ? (
        <UsageTab />
      ) : (
        <InvoicesTab
          showToast={(msg, type) => setToast({ message: msg, type })}
        />
      )}
    </div>
  );
}

// ===== プラン管理タブ =====
function PlansTab({
  showToast,
}: {
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0,
  });

  // プラン変更モーダル
  const [editModal, setEditModal] = useState<{
    tenantId: string;
    tenantName: string;
    planName: string;
    monthlyFee: number;
    setupFee: number;
    notes: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        status: statusFilter,
        search,
        page: String(pagination.page),
        limit: String(pagination.limit),
      });

      const res = await fetch(
        `/api/platform/billing/plans?${params}`,
        { credentials: "include" },
      );

      if (!res.ok) throw new Error(`エラー: ${res.status}`);

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "取得に失敗しました");

      setPlans(data.plans || []);
      setPagination(data.pagination);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "予期しないエラー";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, pagination.page, pagination.limit]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // 検索時にページを1に戻す
  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // プラン変更保存
  const savePlan = async () => {
    if (!editModal) return;
    setSaving(true);

    try {
      const res = await fetch(
        `/api/platform/billing/plans/${editModal.tenantId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            planName: editModal.planName,
            monthlyFee: editModal.monthlyFee,
            setupFee: editModal.setupFee,
            notes: editModal.notes || null,
          }),
        },
      );

      if (!res.ok) throw new Error(`エラー: ${res.status}`);

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "更新に失敗しました");

      showToast("プランを更新しました", "success");
      setEditModal(null);
      loadPlans();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "予期しないエラー";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* 検索バー + フィルター */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="テナント名で検索..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="all">全てのステータス</option>
          <option value="active">有効</option>
          <option value="suspended">停止中</option>
          <option value="cancelled">解約済み</option>
        </select>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg text-red-700 p-4 mb-6">
          {error}
        </div>
      )}

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  テナント名
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  プラン
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  月額
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  初期費用
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  契約開始日
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // ローディングスケルトン
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-slate-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : plans.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    プランデータが見つかりません
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 text-sm">
                        {plan.tenants?.name || "不明"}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {plan.tenants?.slug || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          PLAN_BADGE_COLORS[plan.plan_name] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {PLAN_LABELS[plan.plan_name] || plan.plan_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      {formatYen(plan.monthly_fee)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      {formatYen(plan.setup_fee)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(plan.started_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          PLAN_STATUS_COLORS[plan.status] ||
                          "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {PLAN_STATUS_LABELS[plan.status] || plan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() =>
                          setEditModal({
                            tenantId: plan.tenant_id,
                            tenantName: plan.tenants?.name || "不明",
                            planName: plan.plan_name,
                            monthlyFee: plan.monthly_fee,
                            setupFee: plan.setup_fee,
                            notes: plan.notes || "",
                          })
                        }
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        変更
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-600">
              全{pagination.total}件中{" "}
              {(pagination.page - 1) * pagination.limit + 1}〜
              {Math.min(
                pagination.page * pagination.limit,
                pagination.total,
              )}
              件表示
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: prev.page - 1,
                  }))
                }
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                前へ
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-600">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: prev.page + 1,
                  }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* プラン変更モーダル */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setEditModal(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                プラン変更
              </h3>
              <button
                onClick={() => setEditModal(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* テナント名表示 */}
            <div className="mb-5 px-4 py-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">テナント</p>
              <p className="text-sm font-medium text-slate-900">
                {editModal.tenantName}
              </p>
            </div>

            {/* プラン選択 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                プラン
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  ["trial", "standard", "premium", "enterprise"] as const
                ).map((plan) => (
                  <button
                    key={plan}
                    onClick={() =>
                      setEditModal({
                        ...editModal,
                        planName: plan,
                        monthlyFee: MONTHLY_FEE_PRESETS[plan],
                      })
                    }
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      editModal.planName === plan
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="block">{PLAN_LABELS[plan]}</span>
                    <span className="block text-xs mt-1 opacity-70">
                      {formatYen(MONTHLY_FEE_PRESETS[plan])}/月
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 月額入力 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                月額（カスタム）
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  ¥
                </span>
                <input
                  type="number"
                  value={editModal.monthlyFee}
                  onChange={(e) =>
                    setEditModal({
                      ...editModal,
                      monthlyFee: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* 初期費用入力 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                初期費用
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  ¥
                </span>
                <input
                  type="number"
                  value={editModal.setupFee}
                  onChange={(e) =>
                    setEditModal({
                      ...editModal,
                      setupFee: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* 備考 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                備考
              </label>
              <textarea
                value={editModal.notes}
                onChange={(e) =>
                  setEditModal({ ...editModal, notes: e.target.value })
                }
                rows={3}
                placeholder="変更理由や特記事項など"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* ボタン */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={savePlan}
                disabled={saving}
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ===== 使用量タブ =====
type UsageData = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  month: string;
  messageCount: number;
  quota: number;
  remaining: number;
  overageCount: number;
  overageUnitPrice: number;
  overageAmount: number;
};

function UsageTab() {
  const [usages, setUsages] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/platform/billing/usage?month=${month}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error(`エラー: ${res.status}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "取得に失敗しました");
        setUsages(data.usages || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "予期しないエラー");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [month]);

  const totalMessages = usages.reduce((s, u) => s + u.messageCount, 0);
  const totalOverage = usages.reduce((s, u) => s + u.overageAmount, 0);

  return (
    <>
      {/* 月選択 + サマリー */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-slate-500">合計送信数: </span>
            <span className="font-bold text-slate-900">
              {totalMessages.toLocaleString()}通
            </span>
          </div>
          <div>
            <span className="text-slate-500">超過料金合計: </span>
            <span className="font-bold text-slate-900">
              {formatYen(totalOverage)}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg text-red-700 p-4 mb-6">
          {error}
        </div>
      )}

      {/* テナント別使用量テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  テナント
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  送信数
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  クォータ
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  残り
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  超過数
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  超過料金
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                  消費率
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-slate-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : usages.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    使用量データがありません
                  </td>
                </tr>
              ) : (
                usages.map((u) => {
                  const pct =
                    u.quota > 0
                      ? Math.min(100, Math.round((u.messageCount / u.quota) * 100))
                      : 0;
                  return (
                    <tr
                      key={u.tenantId}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 text-sm">
                          {u.tenantName}
                        </div>
                        <div className="text-xs text-slate-400">{u.tenantSlug}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                        {u.messageCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-600">
                        {u.quota.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-600">
                        {u.remaining.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <span
                          className={
                            u.overageCount > 0
                              ? "font-bold text-red-600"
                              : "text-slate-400"
                          }
                        >
                          {u.overageCount > 0
                            ? `+${u.overageCount.toLocaleString()}`
                            : "0"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <span
                          className={
                            u.overageAmount > 0
                              ? "font-bold text-red-600"
                              : "text-slate-400"
                          }
                        >
                          {u.overageAmount > 0
                            ? formatYen(u.overageAmount)
                            : "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct >= 90
                                  ? "bg-red-500"
                                  : pct >= 70
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-10 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ===== 請求書タブ =====
function InvoicesTab({
  showToast,
}: {
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [kpi, setKpi] = useState<KPI>({
    totalBilled: 0,
    totalPending: 0,
    totalPaid: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0,
  });

  // テナント一覧（フィルター用 + 請求書作成用）
  const [tenants, setTenants] = useState<TenantInfo[]>([]);

  // 請求書作成モーダル
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    tenantId: "",
    amount: 0,
    taxAmount: 0,
    billingPeriodStart: "",
    billingPeriodEnd: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  // ステータス変更モーダル
  const [statusModal, setStatusModal] = useState<{
    invoiceId: string;
    currentStatus: string;
    newStatus: string;
    tenantName: string;
    amount: number;
  } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // テナント一覧取得
  useEffect(() => {
    const loadTenants = async () => {
      try {
        const res = await fetch(
          "/api/platform/tenants?limit=100",
          { credentials: "include" },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setTenants(
              (data.tenants || []).map(
                (t: { id: string; name: string; slug: string; is_active: boolean }) => ({
                  id: t.id,
                  name: t.name,
                  slug: t.slug,
                  is_active: t.is_active,
                }),
              ),
            );
          }
        }
      } catch {
        // テナント取得エラーはサイレントに処理
      }
    };
    loadTenants();
  }, []);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (tenantFilter) {
        params.set("tenant_id", tenantFilter);
      }

      const res = await fetch(
        `/api/platform/billing/invoices?${params}`,
        { credentials: "include" },
      );

      if (!res.ok) throw new Error(`エラー: ${res.status}`);

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "取得に失敗しました");

      setInvoices(data.invoices || []);
      setKpi(data.kpi || { totalBilled: 0, totalPending: 0, totalPaid: 0 });
      setPagination(data.pagination);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "予期しないエラー";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tenantFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleTenantFilter = (value: string) => {
    setTenantFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // 請求書作成
  const createInvoice = async () => {
    if (!createForm.tenantId) {
      showToast("テナントを選択してください", "error");
      return;
    }
    if (!createForm.billingPeriodStart || !createForm.billingPeriodEnd) {
      showToast("請求期間を入力してください", "error");
      return;
    }
    setCreating(true);

    try {
      const res = await fetch(
        "/api/platform/billing/invoices",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            tenantId: createForm.tenantId,
            amount: createForm.amount,
            taxAmount: createForm.taxAmount,
            billingPeriodStart: createForm.billingPeriodStart,
            billingPeriodEnd: createForm.billingPeriodEnd,
            notes: createForm.notes || null,
          }),
        },
      );

      if (!res.ok) throw new Error(`エラー: ${res.status}`);

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "作成に失敗しました");

      showToast("請求書を作成しました", "success");
      setCreateModal(false);
      setCreateForm({
        tenantId: "",
        amount: 0,
        taxAmount: 0,
        billingPeriodStart: "",
        billingPeriodEnd: "",
        notes: "",
      });
      loadInvoices();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "予期しないエラー";
      showToast(message, "error");
    } finally {
      setCreating(false);
    }
  };

  // ステータス更新
  const updateInvoiceStatus = async () => {
    if (!statusModal) return;
    setUpdatingStatus(true);

    try {
      const res = await fetch(
        `/api/platform/billing/invoices/${statusModal.invoiceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            status: statusModal.newStatus,
          }),
        },
      );

      if (!res.ok) throw new Error(`エラー: ${res.status}`);

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "更新に失敗しました");

      showToast("ステータスを更新しました", "success");
      setStatusModal(null);
      loadInvoices();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "予期しないエラー";
      showToast(message, "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // CSVエクスポート
  const exportCSV = () => {
    if (invoices.length === 0) {
      showToast("エクスポートするデータがありません", "error");
      return;
    }

    const headers = [
      "請求日",
      "テナント名",
      "期間開始",
      "期間終了",
      "金額",
      "税額",
      "合計",
      "ステータス",
      "入金日",
      "備考",
    ];

    const rows = invoices.map((inv) => [
      formatDate(inv.created_at),
      inv.tenants?.name || "不明",
      inv.billing_period_start,
      inv.billing_period_end,
      String(inv.amount),
      String(inv.tax_amount),
      String(inv.amount + inv.tax_amount),
      INVOICE_STATUS_LABELS[inv.status] || inv.status,
      inv.paid_at ? formatDate(inv.paid_at) : "",
      inv.notes || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    // BOM付きUTF-8でCSV生成
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `請求書_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSVをエクスポートしました", "success");
  };

  return (
    <>
      {/* KPIカード（3列） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
            今月請求総額
          </p>
          {loading ? (
            <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-2xl font-bold text-slate-900">
              {formatYen(kpi.totalBilled)}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
            未収金額
          </p>
          {loading ? (
            <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-2xl font-bold text-slate-900">
              {formatYen(kpi.totalPending)}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
            入金済み額
          </p>
          {loading ? (
            <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-2xl font-bold text-slate-900">
              {formatYen(kpi.totalPaid)}
            </p>
          )}
        </div>
      </div>

      {/* アクションバー */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* テナントフィルター */}
          <select
            value={tenantFilter}
            onChange={(e) => handleTenantFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">全テナント</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* ステータスフィルター */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">全てのステータス</option>
            <option value="pending">未払い</option>
            <option value="paid">入金済み</option>
            <option value="overdue">延滞</option>
            <option value="cancelled">キャンセル</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            CSVエクスポート
          </button>
          <button
            onClick={() => setCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            新規請求書作成
          </button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg text-red-700 p-4 mb-6">
          {error}
        </div>
      )}

      {/* 請求書テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  請求日
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  テナント名
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  期間
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  税額
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-slate-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    請求書データが見つかりません
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDateTime(inv.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 text-sm">
                        {inv.tenants?.name || "不明"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span>{formatDate(inv.billing_period_start)}</span>
                      <span className="mx-1 text-slate-400">〜</span>
                      <span>{formatDate(inv.billing_period_end)}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      {formatYen(inv.amount)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                      {formatYen(inv.tax_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          INVOICE_STATUS_COLORS[inv.status] ||
                          "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {inv.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                setStatusModal({
                                  invoiceId: inv.id,
                                  currentStatus: inv.status,
                                  newStatus: "paid",
                                  tenantName:
                                    inv.tenants?.name || "不明",
                                  amount: inv.amount,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              入金
                            </button>
                            <button
                              onClick={() =>
                                setStatusModal({
                                  invoiceId: inv.id,
                                  currentStatus: inv.status,
                                  newStatus: "overdue",
                                  tenantName:
                                    inv.tenants?.name || "不明",
                                  amount: inv.amount,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              延滞
                            </button>
                          </>
                        )}
                        {inv.status === "overdue" && (
                          <button
                            onClick={() =>
                              setStatusModal({
                                invoiceId: inv.id,
                                currentStatus: inv.status,
                                newStatus: "paid",
                                tenantName:
                                  inv.tenants?.name || "不明",
                                amount: inv.amount,
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            入金
                          </button>
                        )}
                        {inv.status === "paid" && (
                          <span className="text-xs text-slate-400">
                            {formatDate(inv.paid_at)}
                          </span>
                        )}
                        {(inv.status === "pending" ||
                          inv.status === "overdue") && (
                          <button
                            onClick={() =>
                              setStatusModal({
                                invoiceId: inv.id,
                                currentStatus: inv.status,
                                newStatus: "cancelled",
                                tenantName:
                                  inv.tenants?.name || "不明",
                                amount: inv.amount,
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            取消
                          </button>
                        )}
                        {/* PDFダウンロードボタン */}
                        <button
                          onClick={() =>
                            window.open(
                              `/api/platform/billing/invoices/${inv.id}/pdf`,
                              "_blank",
                            )
                          }
                          className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-600">
              全{pagination.total}件中{" "}
              {(pagination.page - 1) * pagination.limit + 1}〜
              {Math.min(
                pagination.page * pagination.limit,
                pagination.total,
              )}
              件表示
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: prev.page - 1,
                  }))
                }
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                前へ
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-600">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: prev.page + 1,
                  }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 請求書作成モーダル */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setCreateModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                新規請求書作成
              </h3>
              <button
                onClick={() => setCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* テナント選択 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                テナント <span className="text-red-500">*</span>
              </label>
              <select
                value={createForm.tenantId}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    tenantId: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">テナントを選択...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 金額 */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  金額（税抜） <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    ¥
                  </span>
                  <input
                    type="number"
                    value={createForm.amount}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        amount: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  税額
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    ¥
                  </span>
                  <input
                    type="number"
                    value={createForm.taxAmount}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        taxAmount: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 合計プレビュー */}
            {(createForm.amount > 0 || createForm.taxAmount > 0) && (
              <div className="mb-5 px-4 py-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">請求合計</p>
                <p className="text-lg font-bold text-blue-900">
                  {formatYen(createForm.amount + createForm.taxAmount)}
                </p>
              </div>
            )}

            {/* 期間 */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  期間（開始） <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={createForm.billingPeriodStart}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      billingPeriodStart: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  期間（終了） <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={createForm.billingPeriodEnd}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      billingPeriodEnd: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* 備考 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                備考
              </label>
              <textarea
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    notes: e.target.value,
                  })
                }
                rows={3}
                placeholder="補足情報など"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* ボタン */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCreateModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={createInvoice}
                disabled={creating}
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ステータス変更確認モーダル */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setStatusModal(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              ステータス変更確認
            </h3>

            <div className="mb-6 space-y-3">
              <div className="px-4 py-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">テナント</p>
                <p className="text-sm font-medium text-slate-900">
                  {statusModal.tenantName}
                </p>
              </div>
              <div className="px-4 py-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">金額</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatYen(statusModal.amount)}
                </p>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500 mb-1">変更前</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      INVOICE_STATUS_COLORS[statusModal.currentStatus] ||
                      "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {INVOICE_STATUS_LABELS[statusModal.currentStatus] ||
                      statusModal.currentStatus}
                  </span>
                </div>
                <svg
                  className="w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
                <div>
                  <p className="text-xs text-slate-500 mb-1">変更後</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      INVOICE_STATUS_COLORS[statusModal.newStatus] ||
                      "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {INVOICE_STATUS_LABELS[statusModal.newStatus] ||
                      statusModal.newStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStatusModal(null)}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={updateInvoiceStatus}
                disabled={updatingStatus}
                className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  statusModal.newStatus === "paid"
                    ? "bg-green-600 hover:bg-green-700"
                    : statusModal.newStatus === "overdue"
                      ? "bg-red-600 hover:bg-red-700"
                      : statusModal.newStatus === "cancelled"
                        ? "bg-gray-600 hover:bg-gray-700"
                        : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {updatingStatus ? "変更中..." : "変更する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
