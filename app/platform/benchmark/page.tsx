"use client";

// app/platform/benchmark/page.tsx
// プラットフォーム管理: クリニック間ベンチマーク

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";

// Rechartsコンポーネントを動的インポート（SSR回避）
const BenchmarkCharts = dynamic(() => import("./benchmark-charts").then(m => ({ default: m.TenantRankingChart })), {
  ssr: false,
  loading: () => (
    <div className="h-60 bg-zinc-100 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-sm text-zinc-400">グラフを読み込み中...</span>
    </div>
  ),
});

// --- 型定義 ---

interface TenantKPI {
  id: string;
  name: string;
  slug: string;
  funnel: {
    intakeToReservation: number;
    reservationToConsultation: number;
    consultationToPayment: number;
  };
  aiReply: {
    approvalRate: number;
    editRate: number;
    totalDrafts: number;
  };
  line: {
    blockRate: number;
    followers: number;
  };
  revenue: {
    monthlyRevenue: number;
    avgOrderAmount: number;
    reorderRate: number;
    orderCount: number;
  };
}

interface BenchmarkValues {
  avg: number;
  top20: number;
  bottom20: number;
}

interface BenchmarkData {
  ok: boolean;
  tenants: TenantKPI[];
  benchmarks: {
    funnel: {
      intakeToReservation: BenchmarkValues;
      reservationToConsultation: BenchmarkValues;
      consultationToPayment: BenchmarkValues;
    };
    aiReply: { approvalRate: BenchmarkValues };
    line: { blockRate: BenchmarkValues };
    revenue: {
      monthlyRevenue: BenchmarkValues;
      avgOrderAmount: BenchmarkValues;
      reorderRate: BenchmarkValues;
    };
  } | null;
}

type SortKey = "name" | "intakeToReservation" | "reservationToConsultation" | "consultationToPayment" | "approvalRate" | "blockRate" | "monthlyRevenue" | "avgOrderAmount" | "reorderRate";
type ChartKPI = "intakeToReservation" | "reservationToConsultation" | "consultationToPayment" | "approvalRate" | "blockRate" | "monthlyRevenue" | "avgOrderAmount" | "reorderRate";

// ソートキーからテナントの値を取得
function getTenantValue(t: TenantKPI, key: SortKey): number | string {
  switch (key) {
    case "name": return t.name;
    case "intakeToReservation": return t.funnel.intakeToReservation;
    case "reservationToConsultation": return t.funnel.reservationToConsultation;
    case "consultationToPayment": return t.funnel.consultationToPayment;
    case "approvalRate": return t.aiReply.approvalRate;
    case "blockRate": return t.line.blockRate;
    case "monthlyRevenue": return t.revenue.monthlyRevenue;
    case "avgOrderAmount": return t.revenue.avgOrderAmount;
    case "reorderRate": return t.revenue.reorderRate;
  }
}

// 平均比較バッジ
function ComparisonBadge({ value, avg, invert }: { value: number; avg: number; invert?: boolean }) {
  if (avg === 0) return <span className="text-zinc-400">—</span>;
  const diff = value - avg;
  const isGood = invert ? diff < 0 : diff > 0;
  const isNeutral = Math.abs(diff) < 0.5;

  if (isNeutral) {
    return <span className="text-zinc-500 text-xs">≈ 平均</span>;
  }

  return (
    <span className={`text-xs font-medium ${isGood ? "text-emerald-600" : "text-red-500"}`}>
      {isGood ? "▲" : "▼"} {Math.abs(diff).toFixed(1)}
    </span>
  );
}

// KPIサマリーカード
function SummaryCard({ label, value, unit, sub, icon, color }: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  icon: string;
  color: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-zinc-200 p-5 shadow-sm`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${color}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-zinc-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-zinc-900">{value}</span>
        {unit && <span className="text-sm text-zinc-500">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

// テーブルヘッダー
function SortableHeader({ label, sortKey, currentSort, currentDir, onSort }: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-900 select-none whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-1">{currentDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );
}

// チャートKPI選択肢
const CHART_KPI_OPTIONS: { key: ChartKPI; label: string; unit: string; color: string; format?: (v: number) => string }[] = [
  { key: "intakeToReservation", label: "問診→予約", unit: "%", color: "#6366F1" },
  { key: "reservationToConsultation", label: "予約→診察", unit: "%", color: "#6366F1" },
  { key: "consultationToPayment", label: "診察→決済", unit: "%", color: "#6366F1" },
  { key: "approvalRate", label: "AI返信採用率", unit: "%", color: "#8B5CF6" },
  { key: "blockRate", label: "ブロック率", unit: "%", color: "#EC4899" },
  { key: "monthlyRevenue", label: "月間売上", unit: "", color: "#10B981", format: (v: number) => `¥${v.toLocaleString()}` },
  { key: "avgOrderAmount", label: "平均注文額", unit: "", color: "#10B981", format: (v: number) => `¥${v.toLocaleString()}` },
  { key: "reorderRate", label: "再処方率", unit: "%", color: "#F59E0B" },
];

// チャートKPIからテナント値を取得
function getChartValue(t: TenantKPI, key: ChartKPI): number {
  return getTenantValue(t, key) as number;
}

export default function BenchmarkPage() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("monthlyRevenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [chartKPI, setChartKPI] = useState<ChartKPI>("monthlyRevenue");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/platform/benchmark", { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "データ取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ソート処理
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const sortedTenants = useMemo(() => {
    if (!data?.tenants) return [];
    return [...data.tenants].sort((a, b) => {
      const va = getTenantValue(a, sortKey);
      const vb = getTenantValue(b, sortKey);
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [data?.tenants, sortKey, sortDir]);

  // チャート用データ
  const chartData = useMemo(() => {
    if (!data?.tenants) return [];
    return data.tenants.map(t => ({
      name: t.name.length > 10 ? t.name.slice(0, 10) + "…" : t.name,
      value: getChartValue(t, chartKPI),
    }));
  }, [data?.tenants, chartKPI]);

  const selectedChartOption = CHART_KPI_OPTIONS.find(o => o.key === chartKPI)!;
  const chartAvg = data?.benchmarks
    ? (() => {
        switch (chartKPI) {
          case "intakeToReservation": return data.benchmarks.funnel.intakeToReservation.avg;
          case "reservationToConsultation": return data.benchmarks.funnel.reservationToConsultation.avg;
          case "consultationToPayment": return data.benchmarks.funnel.consultationToPayment.avg;
          case "approvalRate": return data.benchmarks.aiReply.approvalRate.avg;
          case "blockRate": return data.benchmarks.line.blockRate.avg;
          case "monthlyRevenue": return data.benchmarks.revenue.monthlyRevenue.avg;
          case "avgOrderAmount": return data.benchmarks.revenue.avgOrderAmount.avg;
          case "reorderRate": return data.benchmarks.revenue.reorderRate.avg;
        }
      })()
    : undefined;

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-64 bg-zinc-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-zinc-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-zinc-200 p-5 animate-pulse h-32" />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-6 animate-pulse h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data || !data.tenants.length) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">クリニック間ベンチマーク</h1>
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-8 text-center text-zinc-500">
          アクティブなテナントがありません
        </div>
      </div>
    );
  }

  const bm = data.benchmarks!;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">クリニック間ベンチマーク</h1>
        <p className="text-sm text-zinc-500 mt-1">
          全{data.tenants.length}クリニックのKPIを比較 — 平均・上位20%・下位20%
        </p>
      </div>

      {/* KPIサマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          label="平均ファネル転換率"
          value={`${bm.funnel.consultationToPayment.avg}`}
          unit="%"
          sub={`上位20%: ${bm.funnel.consultationToPayment.top20}% / 下位20%: ${bm.funnel.consultationToPayment.bottom20}%`}
          icon="🔄"
          color="bg-indigo-50"
        />
        <SummaryCard
          label="平均AI返信採用率"
          value={`${bm.aiReply.approvalRate.avg}`}
          unit="%"
          sub={`上位20%: ${bm.aiReply.approvalRate.top20}% / 下位20%: ${bm.aiReply.approvalRate.bottom20}%`}
          icon="🤖"
          color="bg-purple-50"
        />
        <SummaryCard
          label="平均ブロック率"
          value={`${bm.line.blockRate.avg}`}
          unit="%"
          sub={`上位20%: ${bm.line.blockRate.top20}% / 下位20%: ${bm.line.blockRate.bottom20}%`}
          icon="🚫"
          color="bg-pink-50"
        />
        <SummaryCard
          label="平均月間売上"
          value={`¥${Math.round(bm.revenue.monthlyRevenue.avg).toLocaleString()}`}
          sub={`上位20%: ¥${bm.revenue.monthlyRevenue.top20.toLocaleString()} / 下位20%: ¥${bm.revenue.monthlyRevenue.bottom20.toLocaleString()}`}
          icon="💰"
          color="bg-emerald-50"
        />
      </div>

      {/* テナント比較テーブル */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-lg font-semibold text-zinc-900">テナント別KPI一覧</h2>
          <p className="text-xs text-zinc-400 mt-0.5">列をクリックでソート — 値は平均との差をカラー表示</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <SortableHeader label="クリニック名" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="問診→予約" sortKey="intakeToReservation" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="予約→診察" sortKey="reservationToConsultation" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="診察→決済" sortKey="consultationToPayment" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="AI採用率" sortKey="approvalRate" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="ブロック率" sortKey="blockRate" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="月間売上" sortKey="monthlyRevenue" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="平均注文額" sortKey="avgOrderAmount" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="再処方率" sortKey="reorderRate" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {sortedTenants.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-3 py-3 font-medium text-zinc-900 whitespace-nowrap">{t.name}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="mr-2">{t.funnel.intakeToReservation}%</span>
                    <ComparisonBadge value={t.funnel.intakeToReservation} avg={bm.funnel.intakeToReservation.avg} />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="mr-2">{t.funnel.reservationToConsultation}%</span>
                    <ComparisonBadge value={t.funnel.reservationToConsultation} avg={bm.funnel.reservationToConsultation.avg} />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="mr-2">{t.funnel.consultationToPayment}%</span>
                    <ComparisonBadge value={t.funnel.consultationToPayment} avg={bm.funnel.consultationToPayment.avg} />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="mr-2">{t.aiReply.approvalRate}%</span>
                    <ComparisonBadge value={t.aiReply.approvalRate} avg={bm.aiReply.approvalRate.avg} />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="mr-2">{t.line.blockRate}%</span>
                    <ComparisonBadge value={t.line.blockRate} avg={bm.line.blockRate.avg} invert />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="mr-2">¥{t.revenue.monthlyRevenue.toLocaleString()}</span>
                    <ComparisonBadge value={t.revenue.monthlyRevenue} avg={bm.revenue.monthlyRevenue.avg} />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="mr-2">¥{t.revenue.avgOrderAmount.toLocaleString()}</span>
                    <ComparisonBadge value={t.revenue.avgOrderAmount} avg={bm.revenue.avgOrderAmount.avg} />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="mr-2">{t.revenue.reorderRate}%</span>
                    <ComparisonBadge value={t.revenue.reorderRate} avg={bm.revenue.reorderRate.avg} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPIランキングチャート */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">KPIランキング</h2>
            <p className="text-xs text-zinc-400 mt-0.5">テナント別の比較チャート（点線は平均値）</p>
          </div>
          <select
            value={chartKPI}
            onChange={(e) => setChartKPI(e.target.value as ChartKPI)}
            className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {CHART_KPI_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="p-6">
          <BenchmarkCharts
            data={chartData}
            color={selectedChartOption.color}
            unit={selectedChartOption.unit}
            avg={chartAvg}
            format={selectedChartOption.format}
          />
        </div>
      </div>
    </div>
  );
}
