"use client";

// app/platform/tenants/page.tsx
// テナント一覧ページ — カード型レイアウト、検索、フィルター、ページネーション

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// テナントデータ型
interface TenantPlan {
  plan_name: string;
  monthly_fee: number;
  setup_fee: number;
  started_at: string | null;
  next_billing_at: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  tenant_plans: TenantPlan[];
  patients_count: number;
  monthly_revenue: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type StatusFilter = "all" | "active" | "inactive";
type SortOption = "created_at" | "name" | "patients_count";

export default function TenantsListPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortOption>("created_at");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // 検索のデバウンス
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // テナント一覧取得
  const fetchTenants = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "25",
          status: statusFilter,
          sort,
        });
        if (debouncedSearch) params.set("search", debouncedSearch);

        const res = await fetch(
          `/api/platform/tenants?${params.toString()}`,
          { credentials: "include" },
        );

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "テナント一覧の取得に失敗しました");
        }

        const data = await res.json();
        setTenants(data.tenants || []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 25, totalPages: 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, statusFilter, sort],
  );

  useEffect(() => {
    fetchTenants(1);
  }, [fetchTenants]);

  // 金額フォーマット
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  // プラン名表示
  const planLabel = (planName: string) => {
    const labels: Record<string, string> = {
      trial: "トライアル",
      standard: "スタンダード",
      premium: "プレミアム",
      enterprise: "エンタープライズ",
    };
    return labels[planName] || planName;
  };

  // プランバッジの色
  const planBadgeColor = (planName: string) => {
    const colors: Record<string, string> = {
      trial: "bg-yellow-100 text-yellow-700 border-yellow-200",
      standard: "bg-blue-100 text-blue-700 border-blue-200",
      premium: "bg-purple-100 text-purple-700 border-purple-200",
      enterprise: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
    return colors[planName] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  // ステータスフィルターのタブ
  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "全て" },
    { key: "active", label: "有効" },
    { key: "inactive", label: "無効" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ページヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">テナント管理</h1>
            <p className="mt-1 text-sm text-slate-500">
              登録テナントの一覧と管理
            </p>
          </div>
          <button
            onClick={() => router.push("/platform/tenants/create")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
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
            新規作成
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* 検索・フィルターバー */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 検索 */}
            <div className="flex-1 relative">
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="テナント名またはslugで検索..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* ソート */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at">作成日順</option>
              <option value="name">名前順</option>
              <option value="patients_count">患者数順</option>
            </select>
          </div>

          {/* ステータスフィルタータブ */}
          <div className="flex gap-1 mt-4 border-t border-slate-100 pt-4">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === tab.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ローディングスケルトン */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 animate-pulse"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                  <div className="h-6 w-16 bg-slate-200 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <div className="h-3 bg-slate-200 rounded w-1/2 mb-1" />
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                  </div>
                  <div>
                    <div className="h-3 bg-slate-200 rounded w-1/2 mb-1" />
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tenants.length === 0 ? (
          /* 空状態 */
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">
              テナントがありません
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {search
                ? "検索条件に一致するテナントが見つかりません"
                : "最初のテナントを作成してください"}
            </p>
            {!search && (
              <button
                onClick={() => router.push("/platform/tenants/create")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
                テナントを作成
              </button>
            )}
          </div>
        ) : (
          /* テナントカード一覧 */
          <>
            {/* 件数表示 */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                {pagination.total}件中 {(pagination.page - 1) * pagination.limit + 1}〜
                {Math.min(pagination.page * pagination.limit, pagination.total)}件を表示
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tenants.map((tenant) => {
                const plan = tenant.tenant_plans?.[0];
                return (
                  <div
                    key={tenant.id}
                    onClick={() =>
                      router.push(`/platform/tenants/${tenant.id}`)
                    }
                    className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
                  >
                    {/* ヘッダー行: テナント名 + ステータス */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {tenant.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          {tenant.slug}.lope.jp
                        </p>
                      </div>
                      <span
                        className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tenant.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {tenant.is_active ? "有効" : "無効"}
                      </span>
                    </div>

                    {/* プランバッジ */}
                    {plan && (
                      <div className="mb-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${planBadgeColor(plan.plan_name)}`}
                        >
                          {planLabel(plan.plan_name)}
                        </span>
                      </div>
                    )}

                    {/* KPI行 */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">患者数</p>
                        <p className="text-lg font-bold text-slate-900">
                          {tenant.patients_count.toLocaleString()}
                          <span className="text-xs font-normal text-slate-400 ml-0.5">
                            人
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">
                          今月売上
                        </p>
                        <p className="text-lg font-bold text-slate-900">
                          {formatCurrency(tenant.monthly_revenue)}
                        </p>
                      </div>
                    </div>

                    {/* フッター */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        作成: {formatDate(tenant.created_at)}
                      </p>
                      <svg
                        className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ページネーション */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => fetchTenants(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  前へ
                </button>
                {Array.from(
                  { length: pagination.totalPages },
                  (_, i) => i + 1,
                )
                  .filter((p) => {
                    // 現在ページ付近のみ表示（最大7ページ分）
                    const current = pagination.page;
                    return (
                      p === 1 ||
                      p === pagination.totalPages ||
                      Math.abs(p - current) <= 2
                    );
                  })
                  .map((p, idx, arr) => {
                    // 省略記号の挿入
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <span key={p} className="flex items-center gap-1">
                        {showEllipsis && (
                          <span className="px-2 text-slate-400">...</span>
                        )}
                        <button
                          onClick={() => fetchTenants(p)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            p === pagination.page
                              ? "bg-blue-600 text-white shadow-sm"
                              : "border border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
                <button
                  onClick={() => fetchTenants(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  次へ
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
