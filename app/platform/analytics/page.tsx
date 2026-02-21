"use client";

// app/platform/analytics/page.tsx
// プラットフォーム管理: 分析ダッシュボード（財務/チャーン/リテンション/機能利用）

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

// Rechartsコンポーネントを動的インポート（SSR回避）
const AnalyticsCharts = dynamic(() => import("./analytics-charts"), {
  ssr: false,
  loading: () => (
    <div className="h-80 bg-zinc-100 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-sm text-zinc-400">グラフを読み込み中...</span>
    </div>
  ),
});

// --- 型定義 ---

interface FinancialData {
  mrr: number;
  arr: number;
  unpaidAmount: number;
  monthlyTrend: { month: string; amount: number }[];
  planDistribution: { planName: string; count: number; monthlyTotal: number }[];
}

interface ChurnTenant {
  tenantId: string;
  tenantName: string;
  slug: string;
  riskScore: number;
  loginCount: number;
  currentRevenue: number;
  prevRevenue: number;
  revenueChangeRate: number;
  unpaidCount: number;
}

interface CohortData {
  month: string;
  totalTenants: number;
  retainedMonths: number[];
}

interface FeatureCategory {
  category: string;
  count: number;
}

interface TenantFeature {
  tenantId: string;
  tenantName: string;
  topFeatures: { category: string; count: number }[];
}

type TabKey = "financial" | "churn" | "retention" | "feature";

// カテゴリの日本語名
const CATEGORY_LABELS: Record<string, string> = {
  admin: "管理画面",
  line: "LINE連携",
  platform: "プラットフォーム",
  reservation: "予約",
  intake: "問診",
  patient: "患者",
  order: "決済",
  shipping: "発送",
  reorder: "再処方",
  doctor: "Dr",
};

export default function AnalyticsDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("financial");

  // 財務
  const [financial, setFinancial] = useState<FinancialData | null>(null);
  const [financialLoading, setFinancialLoading] = useState(false);

  // チャーン
  const [churnTenants, setChurnTenants] = useState<ChurnTenant[]>([]);
  const [churnLoading, setChurnLoading] = useState(false);

  // リテンション
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [retentionLoading, setRetentionLoading] = useState(false);

  // 機能利用
  const [features, setFeatures] = useState<FeatureCategory[]>([]);
  const [tenantUsage, setTenantUsage] = useState<TenantFeature[]>([]);
  const [featureLoading, setFeatureLoading] = useState(false);

  const [error, setError] = useState("");

  // 財務データ取得
  const fetchFinancial = useCallback(async () => {
    if (financial) return; // キャッシュ
    setFinancialLoading(true);
    try {
      const res = await fetch("/api/platform/analytics/financial", { credentials: "include" });
      const json = await res.json();
      if (json.ok) setFinancial(json);
    } catch {
      setError("財務データの取得に失敗しました");
    } finally {
      setFinancialLoading(false);
    }
  }, [financial]);

  // チャーンデータ取得
  const fetchChurn = useCallback(async () => {
    if (churnTenants.length > 0) return;
    setChurnLoading(true);
    try {
      const res = await fetch("/api/platform/analytics/churn", { credentials: "include" });
      const json = await res.json();
      if (json.ok) setChurnTenants(json.tenants || []);
    } catch {
      setError("チャーンデータの取得に失敗しました");
    } finally {
      setChurnLoading(false);
    }
  }, [churnTenants.length]);

  // リテンションデータ取得
  const fetchRetention = useCallback(async () => {
    if (cohorts.length > 0) return;
    setRetentionLoading(true);
    try {
      const res = await fetch("/api/platform/analytics/retention", { credentials: "include" });
      const json = await res.json();
      if (json.ok) setCohorts(json.cohorts || []);
    } catch {
      setError("リテンションデータの取得に失敗しました");
    } finally {
      setRetentionLoading(false);
    }
  }, [cohorts.length]);

  // 機能利用データ取得
  const fetchFeatureUsage = useCallback(async () => {
    if (features.length > 0) return;
    setFeatureLoading(true);
    try {
      const res = await fetch("/api/platform/analytics/feature-usage", { credentials: "include" });
      const json = await res.json();
      if (json.ok) {
        setFeatures(json.features || []);
        setTenantUsage(json.tenantUsage || []);
      }
    } catch {
      setError("機能利用データの取得に失敗しました");
    } finally {
      setFeatureLoading(false);
    }
  }, [features.length]);

  // タブ切替時にデータ取得
  useEffect(() => {
    setError("");
    switch (activeTab) {
      case "financial":
        fetchFinancial();
        break;
      case "churn":
        fetchChurn();
        break;
      case "retention":
        fetchRetention();
        break;
      case "feature":
        fetchFeatureUsage();
        break;
    }
  }, [activeTab, fetchFinancial, fetchChurn, fetchRetention, fetchFeatureUsage]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "financial", label: "財務" },
    { key: "churn", label: "チャーン" },
    { key: "retention", label: "リテンション" },
    { key: "feature", label: "機能利用" },
  ];

  // リスクスコアの色
  const riskColor = (score: number) => {
    if (score <= 30) return "text-green-600 bg-green-50";
    if (score <= 60) return "text-yellow-700 bg-yellow-50";
    return "text-red-700 bg-red-50";
  };

  // リテンションヒートマップの色
  const retentionColor = (rate: number) => {
    if (rate >= 80) return "bg-green-100 text-green-800";
    if (rate >= 60) return "bg-green-50 text-green-700";
    if (rate >= 40) return "bg-yellow-50 text-yellow-700";
    if (rate >= 20) return "bg-orange-50 text-orange-700";
    return "bg-red-50 text-red-700";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">分析ダッシュボード</h1>
        <p className="text-sm text-zinc-500 mt-1">
          財務・チャーン・リテンション・機能利用の統合分析
        </p>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-zinc-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ===== 財務タブ ===== */}
      {activeTab === "financial" && (
        <div>
          {financialLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                    <div className="h-3 bg-zinc-200 rounded w-1/2 mb-2" />
                    <div className="h-7 bg-zinc-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-64 bg-zinc-100 rounded" />
              </div>
            </div>
          ) : financial ? (
            <div className="space-y-6">
              {/* KPIカード */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-amber-500">
                  <p className="text-sm text-zinc-500">MRR（月次経常収益）</p>
                  <p className="text-2xl font-bold text-zinc-900 mt-1">
                    {formatCurrency(financial.mrr)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-blue-500">
                  <p className="text-sm text-zinc-500">ARR（年次経常収益）</p>
                  <p className="text-2xl font-bold text-zinc-900 mt-1">
                    {formatCurrency(financial.arr)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-red-500">
                  <p className="text-sm text-zinc-500">未収金</p>
                  <p className="text-2xl font-bold text-zinc-900 mt-1">
                    {formatCurrency(financial.unpaidAmount)}
                  </p>
                </div>
              </div>

              {/* 月別請求推移グラフ + プラン別構成比 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                  <h2 className="text-base font-semibold text-zinc-900 mb-4">月別請求額推移</h2>
                  <AnalyticsCharts
                    type="financial"
                    monthlyTrend={financial.monthlyTrend}
                    planDistribution={financial.planDistribution}
                  />
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-base font-semibold text-zinc-900 mb-4">プラン別構成比</h2>
                  <AnalyticsCharts
                    type="planPie"
                    planDistribution={financial.planDistribution}
                  />
                  {/* プラン一覧 */}
                  <div className="mt-4 space-y-2">
                    {financial.planDistribution.map((p) => (
                      <div key={p.planName} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600">{p.planName}</span>
                        <span className="text-zinc-900 font-medium">
                          {p.count}件 / {formatCurrency(p.monthlyTotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-10 text-center text-sm text-zinc-400">
              財務データがありません
            </div>
          )}
        </div>
      )}

      {/* ===== チャーンタブ ===== */}
      {activeTab === "churn" && (
        <div>
          {churnLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-zinc-100 rounded animate-pulse" />
              ))}
            </div>
          ) : churnTenants.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-200">
                <h2 className="text-base font-semibold text-zinc-900">チャーンリスクランキング</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  スコア: 0-30(低) / 31-60(中) / 61-100(高)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        テナント
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        リスクスコア
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        ログイン回数(30日)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        今月売上
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        売上変化率
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        未払い
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {churnTenants.map((t) => (
                      <tr key={t.tenantId} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-zinc-900">{t.tenantName}</div>
                          <div className="text-xs text-zinc-400">{t.slug}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-12 h-8 rounded-lg text-sm font-bold ${riskColor(t.riskScore)}`}>
                            {t.riskScore}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-zinc-600">
                          {t.loginCount}回
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-zinc-900 font-medium">
                          {formatCurrency(t.currentRevenue)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-sm font-medium ${
                            t.revenueChangeRate > 0
                              ? "text-green-600"
                              : t.revenueChangeRate < 0
                                ? "text-red-600"
                                : "text-zinc-400"
                          }`}>
                            {t.revenueChangeRate > 0 ? "+" : ""}{t.revenueChangeRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          {t.unpaidCount > 0 ? (
                            <span className="text-red-600 font-medium">{t.unpaidCount}件</span>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-10 text-center text-sm text-zinc-400">
              チャーンデータがありません
            </div>
          )}
        </div>
      )}

      {/* ===== リテンションタブ ===== */}
      {activeTab === "retention" && (
        <div>
          {retentionLoading ? (
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-64 bg-zinc-100 rounded" />
            </div>
          ) : cohorts.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-200">
                <h2 className="text-base font-semibold text-zinc-900">コーホートリテンション</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  各月に登録されたテナントのN ヶ月後の残存率
                </p>
              </div>
              <div className="overflow-x-auto p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">
                        コーホート
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-zinc-500">
                        テナント数
                      </th>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <th
                          key={i}
                          className="text-center py-2 px-2 text-xs font-semibold text-zinc-500 min-w-[56px]"
                        >
                          {i}M
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map((c) => (
                      <tr key={c.month} className="border-t border-zinc-100">
                        <td className="py-2 px-3 font-medium text-zinc-900 whitespace-nowrap">
                          {c.month}
                        </td>
                        <td className="py-2 px-3 text-center text-zinc-600">
                          {c.totalTenants}
                        </td>
                        {Array.from({ length: 12 }).map((_, i) => {
                          if (i >= c.retainedMonths.length) {
                            return (
                              <td key={i} className="py-2 px-2 text-center text-zinc-300">
                                -
                              </td>
                            );
                          }
                          const rate = c.totalTenants > 0
                            ? Math.round((c.retainedMonths[i] / c.totalTenants) * 100)
                            : 0;
                          return (
                            <td
                              key={i}
                              className={`py-2 px-2 text-center font-medium rounded ${retentionColor(rate)}`}
                            >
                              {rate}%
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-10 text-center text-sm text-zinc-400">
              リテンションデータがありません
            </div>
          )}
        </div>
      )}

      {/* ===== 機能利用タブ ===== */}
      {activeTab === "feature" && (
        <div>
          {featureLoading ? (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-64 bg-zinc-100 rounded" />
              </div>
            </div>
          ) : features.length > 0 ? (
            <div className="space-y-6">
              {/* カテゴリ別利用回数グラフ */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-base font-semibold text-zinc-900 mb-4">
                  カテゴリ別利用回数（直近30日）
                </h2>
                <AnalyticsCharts type="featureBar" features={features} />
              </div>

              {/* テナント別Top機能テーブル */}
              {tenantUsage.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-200">
                    <h2 className="text-base font-semibold text-zinc-900">
                      テナント別 トップ機能
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            テナント
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            トップ機能
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {tenantUsage.map((t) => (
                          <tr key={t.tenantId} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                              {t.tenantName}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {t.topFeatures.map((f) => (
                                  <span
                                    key={f.category}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700"
                                  >
                                    {CATEGORY_LABELS[f.category] || f.category}
                                    <span className="text-zinc-400">({f.count})</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-10 text-center text-sm text-zinc-400">
              機能利用データがありません
            </div>
          )}
        </div>
      )}
    </div>
  );
}
