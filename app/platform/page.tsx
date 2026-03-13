"use client";

// app/platform/page.tsx
// プラットフォーム管理ダッシュボード

import Link from "next/link";
import useSWR from "swr";

// ---- 型定義 ----

interface TenantRanking {
  id: string;
  name: string;
  slug: string;
  patientCount: number;
  monthlyRevenue: number;
}

interface MonthlyTrend {
  month: string;
  label: string;
  tenantCount: number;
  revenue: number;
}

interface DashboardStats {
  totalTenants: number;
  totalPatients: number;
  monthlyRevenue: number;
  activeTenants: number;
  totalReservations: number;
  totalLineFriends: number;
  tenantRanking: TenantRanking[];
  monthlyTrend: MonthlyTrend[];
}

// ---- メインコンポーネント ----

export default function PlatformDashboardPage() {
  const { data: rawData, error: swrError, isLoading: loading } = useSWR<{ ok: boolean; stats: DashboardStats; error?: string }>(
    "/api/platform/dashboard-stats"
  );

  const stats = rawData?.ok ? rawData.stats : null;
  const error = swrError?.message || (rawData && !rawData.ok ? (rawData.error || "エラーが発生しました") : "");

  // 月別推移グラフの最大値（棒グラフのスケール用）
  const maxRevenue = stats
    ? Math.max(...stats.monthlyTrend.map((m) => m.revenue), 1)
    : 1;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-lg shadow-lg shadow-violet-500/25">
            <span>P</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              プラットフォーム管理
            </h1>
            <p className="text-sm text-slate-500">
              Lオペ for CLINIC の全テナントを管理
            </p>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPIカード（上段4列） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <KPICard
          icon="🏥"
          label="総テナント数"
          value={stats?.totalTenants}
          color="violet"
          loading={loading}
        />
        <KPICard
          icon="👤"
          label="総患者数"
          value={stats?.totalPatients}
          suffix="人"
          color="green"
          loading={loading}
        />
        <KPICard
          icon="💰"
          label="今月の総売上"
          value={stats?.monthlyRevenue}
          prefix="¥"
          format="currency"
          color="amber"
          loading={loading}
        />
        <KPICard
          icon="✨"
          label="アクティブテナント"
          value={stats?.activeTenants}
          subtitle="今月売上あり"
          color="blue"
          loading={loading}
        />
      </div>

      {/* KPIカード（中段3列） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <KPICard
          icon="📅"
          label="総予約数"
          value={stats?.totalReservations}
          suffix="件"
          color="rose"
          loading={loading}
        />
        <KPICard
          icon="💬"
          label="総LINE友だち数"
          value={stats?.totalLineFriends}
          suffix="人"
          color="emerald"
          loading={loading}
        />
        <KPICard
          icon="📊"
          label="テナント稼働率"
          value={
            stats && stats.totalTenants > 0
              ? Math.round(
                  (stats.activeTenants / stats.totalTenants) * 100
                )
              : 0
          }
          suffix="%"
          subtitle="アクティブ / 全テナント"
          color="cyan"
          loading={loading}
        />
      </div>

      {/* テナント別ランキング + 月別推移 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* テナント別ランキング */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                テナント別ランキング
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                今月の売上上位10件
              </p>
            </div>
            <Link
              href="/platform/tenants"
              className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1"
            >
              テナント管理へ
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 animate-pulse"
                >
                  <div className="w-8 h-8 bg-slate-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                  <div className="h-5 bg-slate-200 rounded w-20" />
                </div>
              ))}
            </div>
          ) : stats?.tenantRanking && stats.tenantRanking.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {/* テーブルヘッダー */}
              <div className="flex items-center px-5 py-3 bg-slate-50">
                <span className="w-10 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  #
                </span>
                <span className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  テナント
                </span>
                <span className="w-24 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  患者数
                </span>
                <span className="w-32 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  今月売上
                </span>
              </div>
              {stats.tenantRanking.map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  {/* 順位 */}
                  <span className="w-10">
                    {i < 3 ? (
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white ${
                          i === 0
                            ? "bg-amber-400"
                            : i === 1
                              ? "bg-slate-400"
                              : "bg-amber-600"
                        }`}
                      >
                        {i + 1}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-7 h-7 text-sm text-slate-400 font-medium">
                        {i + 1}
                      </span>
                    )}
                  </span>
                  {/* テナント名 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {t.name}
                    </div>
                    <div className="text-xs text-slate-400">{t.slug}</div>
                  </div>
                  {/* 患者数 */}
                  <span className="w-24 text-right text-sm text-slate-700 font-medium">
                    {t.patientCount.toLocaleString()}
                  </span>
                  {/* 今月売上 */}
                  <span className="w-32 text-right text-sm font-semibold text-slate-900">
                    ¥{t.monthlyRevenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-slate-400">
              テナントデータがありません
            </div>
          )}
        </div>

        {/* 月別推移グラフ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">月別推移</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              直近6ヶ月のテナント数と売上
            </p>
          </div>

          {loading ? (
            <div className="p-5 space-y-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-end gap-3 animate-pulse">
                  <div className="w-16 h-4 bg-slate-200 rounded" />
                  <div
                    className="flex-1 bg-slate-100 rounded"
                    style={{ height: `${20 + Math.random() * 60}px` }}
                  />
                </div>
              ))}
            </div>
          ) : stats?.monthlyTrend && stats.monthlyTrend.length > 0 ? (
            <div className="p-5">
              {/* 凡例 */}
              <div className="flex items-center gap-6 mb-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-violet-500" />
                  <span>売上</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>テナント数</span>
                </div>
              </div>

              {/* 棒グラフ */}
              <div className="space-y-4">
                {stats.monthlyTrend.map((m) => {
                  const barWidth =
                    maxRevenue > 0
                      ? Math.max((m.revenue / maxRevenue) * 100, 2)
                      : 2;
                  return (
                    <div key={m.month}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-slate-600 w-16">
                          {m.label}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            {m.tenantCount}件
                          </span>
                          <span className="font-medium text-slate-700">
                            ¥{m.revenue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
                          style={{ width: `${barWidth}%` }}
                        >
                          {barWidth > 20 && (
                            <span className="text-[10px] text-white font-medium">
                              ¥{m.revenue.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* テナント数推移（折れ線的表示） */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  テナント数推移
                </h3>
                <div className="flex items-end justify-between gap-2 h-20">
                  {stats.monthlyTrend.map((m) => {
                    const maxTenant = Math.max(
                      ...stats.monthlyTrend.map((t) => t.tenantCount),
                      1
                    );
                    const barHeight = Math.max(
                      (m.tenantCount / maxTenant) * 100,
                      8
                    );
                    return (
                      <div
                        key={m.month}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <span className="text-xs font-bold text-emerald-600">
                          {m.tenantCount}
                        </span>
                        <div
                          className="w-full max-w-[40px] bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-700"
                          style={{ height: `${barHeight}%` }}
                        />
                        <span className="text-[10px] text-slate-400">
                          {m.label.split("/")[1]}月
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-slate-400">
              推移データがありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- KPIカードコンポーネント ----

interface KPICardProps {
  icon: string;
  label: string;
  value: number | undefined;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  format?: "currency" | "number";
  color:
    | "violet"
    | "green"
    | "amber"
    | "blue"
    | "rose"
    | "emerald"
    | "cyan";
  loading: boolean;
}

const COLOR_MAP: Record<
  KPICardProps["color"],
  { border: string; iconBg: string; iconText: string }
> = {
  violet: {
    border: "border-l-violet-500",
    iconBg: "bg-violet-100",
    iconText: "text-violet-600",
  },
  green: {
    border: "border-l-green-500",
    iconBg: "bg-green-100",
    iconText: "text-green-600",
  },
  amber: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
  },
  blue: {
    border: "border-l-blue-500",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
  },
  rose: {
    border: "border-l-rose-500",
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
  },
  emerald: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
  },
  cyan: {
    border: "border-l-cyan-500",
    iconBg: "bg-cyan-100",
    iconText: "text-cyan-600",
  },
};

function KPICard({
  icon,
  label,
  value,
  prefix,
  suffix,
  subtitle,
  format,
  color,
  loading,
}: KPICardProps) {
  const c = COLOR_MAP[color];

  const formatValue = (v: number) => {
    if (format === "currency") return v.toLocaleString();
    return v.toLocaleString();
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 ${c.border} p-5 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-slate-600 font-medium">{label}</span>
        <span
          className={`w-9 h-9 ${c.iconBg} rounded-lg flex items-center justify-center text-lg`}
        >
          {icon}
        </span>
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-24" />
          {subtitle && <div className="h-3 bg-slate-100 rounded w-32" />}
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold text-slate-900">
            {prefix}
            {formatValue(value ?? 0)}
            {suffix && (
              <span className="text-lg font-medium text-slate-400 ml-0.5">
                {suffix}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </>
      )}
    </div>
  );
}
