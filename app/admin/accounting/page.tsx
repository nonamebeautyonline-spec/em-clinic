"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Rechartsはクライアントのみ
const AreaChart = dynamic(() => import("recharts").then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then(m => m.Area), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });

interface DailyData {
  date: string;
  square: number;
  bank: number;
  refund: number;
  total: number;
  squareCount: number;
  bankCount: number;
  firstCount: number;
  reorderCount: number;
}

interface TodaySummary {
  totalSquare: number;
  totalBank: number;
  totalRefund: number;
  totalNet: number;
  squareCount: number;
  bankCount: number;
}

// 売上分析用の型
type AnalyticsTab = "revenue" | "ltv" | "cohort" | "products";

interface AnalyticsDailyData {
  date: string;
  revenue: number;
  gross: number;
  refunds: number;
  count: number;
}

interface LTVData {
  avgLtv: number;
  avgOrders: number;
  totalPatients: number;
  totalRevenue: number;
  distribution: { label: string; count: number }[];
  repeatDist: { label: string; count: number }[];
}

interface CohortRow {
  month: string;
  size: number;
  retention: { monthOffset: number; rate: number }[];
}

interface ProductData {
  code: string;
  revenue: number;
  count: number;
}

export default function AccountingPage() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [todaySummary, setTodaySummary] = useState<TodaySummary>({
    totalSquare: 0,
    totalBank: 0,
    totalRefund: 0,
    totalNet: 0,
    squareCount: 0,
    bankCount: 0,
  });

  // 売上分析用のstate
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>("revenue");

  // SWRで月次データ取得
  const dailyRevenueKey = `/api/admin/daily-revenue?year_month=${selectedMonth}`;
  const { data: dailyRevenueData } = useSWR<{ ok: boolean; data: DailyData[]; summary: { totalSquare: number; totalBank: number; totalRefund: number; totalNet: number; totalSquareCount: number; totalBankCount: number; totalCount: number; avgOrderValue: number } }>(dailyRevenueKey);
  const dailyData = dailyRevenueData?.data ?? [];
  const dailyDataRef = useRef<DailyData[]>([]);
  const dailySummary = dailyRevenueData?.summary ?? {
    totalSquare: 0, totalBank: 0, totalRefund: 0, totalNet: 0,
    totalSquareCount: 0, totalBankCount: 0, totalCount: 0, avgOrderValue: 0,
  };

  // SWRで売上分析データ取得（タブに応じた動的キー）
  const analyticsKey = (() => {
    const from = `${selectedMonth}-01`;
    const [y, m] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
    if (analyticsTab === "revenue") return `/api/admin/analytics?type=daily&from=${from}&to=${to}`;
    if (analyticsTab === "ltv") return "/api/admin/analytics?type=ltv";
    if (analyticsTab === "cohort") return "/api/admin/analytics?type=cohort";
    if (analyticsTab === "products") return `/api/admin/analytics?type=products&from=${from}&to=${to}`;
    return null;
  })();
  const { data: analyticsData, isLoading: analyticsLoading } = useSWR<Record<string, unknown>>(analyticsKey);
  const analyticsDaily = (analyticsTab === "revenue" ? (analyticsData?.daily as AnalyticsDailyData[] | undefined) : undefined) ?? [];
  const ltv = (analyticsTab === "ltv" ? (analyticsData?.ltv as LTVData | undefined) : undefined) ?? null;
  const cohort = (analyticsTab === "cohort" ? (analyticsData?.cohort as CohortRow[] | undefined) : undefined) ?? [];
  const products = (analyticsTab === "products" ? (analyticsData?.products as ProductData[] | undefined) : undefined) ?? [];

  // 日別データから選択日のサマリーを抽出するヘルパー
  const extractDateSummary = useCallback((data: DailyData[], dateStr: string) => {
    const dateData = data.find((d) => d.date === dateStr);
    if (dateData) {
      setTodaySummary({
        totalSquare: dateData.square,
        totalBank: dateData.bank,
        totalRefund: dateData.refund,
        totalNet: dateData.total,
        squareCount: dateData.squareCount,
        bankCount: dateData.bankCount,
      });
    } else {
      setTodaySummary({ totalSquare: 0, totalBank: 0, totalRefund: 0, totalNet: 0, squareCount: 0, bankCount: 0 });
    }
  }, []);

  // SWRデータからdailyDataRefを同期 & 日別サマリーを抽出
  useEffect(() => {
    if (dailyRevenueData?.ok && dailyRevenueData.data) {
      dailyDataRef.current = dailyRevenueData.data;
      extractDateSummary(dailyRevenueData.data, selectedDate);
    }
  }, [dailyRevenueData, selectedDate, extractDateSummary]);

  // 日付変更時: 同月内ならキャッシュ済みのdailyDataから抽出
  useEffect(() => {
    const dateMonth = selectedDate.slice(0, 7);
    if (dateMonth === selectedMonth && dailyDataRef.current.length > 0) {
      extractDateSummary(dailyDataRef.current, selectedDate);
    }
  }, [selectedDate, selectedMonth, extractDateSummary]);

  // 月選択オプション生成（過去12ヶ月）
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    monthOptions.push({ value: val, label });
  }

  const formatYen = (n: number) => `¥${n.toLocaleString()}`;

  const analyticsTabs: { key: AnalyticsTab; label: string }[] = [
    { key: "revenue", label: "売上推移" },
    { key: "ltv", label: "LTV分析" },
    { key: "cohort", label: "コホート" },
    { key: "products", label: "商品別" },
  ];

  const totalAnalyticsRevenue = analyticsDaily.reduce((s, d) => s + d.revenue, 0);
  const totalAnalyticsOrders = analyticsDaily.reduce((s, d) => s + d.count, 0);
  const avgAnalyticsDaily = analyticsDaily.length > 0 ? Math.round(totalAnalyticsRevenue / analyticsDaily.length) : 0;

  const handleExport = () => {
    const from = `${selectedMonth}-01`;
    const [y, m] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
    window.open(`/api/admin/analytics/export?from=${from}&to=${to}`, "_blank");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 日次サマリー */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-bold text-slate-900">日別サマリー</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-blue-600 text-xs mb-1">カード決済</div>
            <div className="text-xl font-bold text-blue-700">¥{todaySummary.totalSquare.toLocaleString()}</div>
            <div className="text-xs text-blue-500 mt-1">{todaySummary.squareCount}件</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-green-600 text-xs mb-1">銀行振込</div>
            <div className="text-xl font-bold text-green-700">¥{todaySummary.totalBank.toLocaleString()}</div>
            <div className="text-xs text-green-500 mt-1">{todaySummary.bankCount}件</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-red-600 text-xs mb-1">返金</div>
            <div className="text-xl font-bold text-red-700">-¥{todaySummary.totalRefund.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-slate-100 rounded-lg">
            <div className="text-slate-600 text-xs mb-1">純売上</div>
            <div className="text-xl font-bold text-slate-900">¥{todaySummary.totalNet.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 月次サマリー */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-bold text-slate-900">月次サマリー</h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-blue-600 text-xs mb-1">カード決済</div>
            <div className="text-xl font-bold text-blue-700">¥{dailySummary.totalSquare.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-green-600 text-xs mb-1">銀行振込</div>
            <div className="text-xl font-bold text-green-700">¥{dailySummary.totalBank.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-red-600 text-xs mb-1">返金</div>
            <div className="text-xl font-bold text-red-700">-¥{dailySummary.totalRefund.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-slate-100 rounded-lg">
            <div className="text-slate-600 text-xs mb-1">純売上</div>
            <div className="text-xl font-bold text-slate-900">¥{dailySummary.totalNet.toLocaleString()}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-purple-600 text-xs mb-1">決済数</div>
            <div className="text-xl font-bold text-purple-700">
              {dailySummary.totalCount.toLocaleString()}件
              <span className="text-xs font-normal ml-2 text-purple-500">
                (カード{dailySummary.totalSquareCount} / 振込{dailySummary.totalBankCount})
              </span>
            </div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-orange-600 text-xs mb-1">顧客単価</div>
            <div className="text-xl font-bold text-orange-700">¥{dailySummary.avgOrderValue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* カスタムサマリー — ダッシュボード風 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-bold text-slate-900">カスタムサマリー</h2>
          <span className="text-xs text-slate-400">{selectedMonth} / {selectedDate}</span>
        </div>

        {/* KPIカード（ダッシュボード風 — 左ボーダー付き） */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-blue-500 bg-blue-50/30">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-slate-600">月間決済数</div>
              <div className="text-xl">💳</div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{dailySummary.totalCount.toLocaleString()}<span className="text-sm font-normal text-slate-400 ml-1">件</span></div>
            <div className="text-xs text-slate-500 mt-1">カード {dailySummary.totalSquareCount} / 振込 {dailySummary.totalBankCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-purple-500 bg-purple-50/30">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-slate-600">月間純売上</div>
              <div className="text-xl">💰</div>
            </div>
            <div className="text-2xl font-bold text-slate-900">¥{dailySummary.totalNet.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">粗利 ¥{(dailySummary.totalSquare + dailySummary.totalBank).toLocaleString()} - 返金 ¥{dailySummary.totalRefund.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-orange-500 bg-orange-50/30">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-slate-600">顧客単価</div>
              <div className="text-xl">📊</div>
            </div>
            <div className="text-2xl font-bold text-slate-900">¥{dailySummary.avgOrderValue.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">月間平均</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-green-500 bg-green-50/30">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-slate-600">日別売上</div>
              <div className="text-xl">📅</div>
            </div>
            <div className="text-2xl font-bold text-slate-900">¥{todaySummary.totalNet.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">{selectedDate} 分</div>
          </div>
        </div>

        {/* 転換率カード（ダッシュボード風 — グラデーション背景） */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          {(() => {
            const totalFirst = dailyData.reduce((s, d) => s + d.firstCount, 0);
            const totalReorder = dailyData.reduce((s, d) => s + d.reorderCount, 0);
            const totalOrders = totalFirst + totalReorder;
            const reorderRate = totalOrders > 0 ? Math.round((totalReorder / totalOrders) * 100) : 0;
            const cardRate = dailySummary.totalCount > 0 ? Math.round((dailySummary.totalSquareCount / dailySummary.totalCount) * 100) : 0;
            const avgDailyRevenue = dailyData.length > 0 ? Math.round(dailySummary.totalNet / dailyData.filter(d => d.total > 0).length || 1) : 0;
            return (
              <>
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-lg shadow-sm p-5 border border-slate-200">
                  <div className="text-sm font-medium text-slate-600 mb-2">再処方比率</div>
                  <div className={`text-3xl font-bold mb-1 ${reorderRate >= 60 ? "text-green-600" : reorderRate >= 40 ? "text-yellow-600" : "text-red-600"}`}>{reorderRate}%</div>
                  <div className="text-xs text-slate-500">新規 {totalFirst}件 / 再処方 {totalReorder}件</div>
                </div>
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-lg shadow-sm p-5 border border-slate-200">
                  <div className="text-sm font-medium text-slate-600 mb-2">カード決済比率</div>
                  <div className={`text-3xl font-bold mb-1 ${cardRate >= 80 ? "text-green-600" : cardRate >= 50 ? "text-yellow-600" : "text-red-600"}`}>{cardRate}%</div>
                  <div className="text-xs text-slate-500">カード {dailySummary.totalSquareCount} / 振込 {dailySummary.totalBankCount}</div>
                </div>
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-lg shadow-sm p-5 border border-slate-200">
                  <div className="text-sm font-medium text-slate-600 mb-2">日平均売上</div>
                  <div className="text-3xl font-bold mb-1 text-blue-600">¥{avgDailyRevenue.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">稼働日ベース</div>
                </div>
              </>
            );
          })()}
        </div>

        {/* ミニ統計行 */}
        <div className="space-y-2">
          {[
            { label: "月間カード決済額", value: `¥${dailySummary.totalSquare.toLocaleString()}`, highlight: undefined as string | undefined },
            { label: "月間振込額", value: `¥${dailySummary.totalBank.toLocaleString()}`, highlight: undefined as string | undefined },
            { label: "月間返金額", value: `-¥${dailySummary.totalRefund.toLocaleString()}`, highlight: dailySummary.totalRefund > 0 ? "red" as const : undefined },
            { label: "当日カード決済", value: `¥${todaySummary.totalSquare.toLocaleString()} (${todaySummary.squareCount}件)`, highlight: undefined as string | undefined },
            { label: "当日振込", value: `¥${todaySummary.totalBank.toLocaleString()} (${todaySummary.bankCount}件)`, highlight: undefined as string | undefined },
          ].map((row) => (
            <div key={row.label} className={`flex items-center justify-between p-3 rounded-lg ${row.highlight === "red" ? "bg-red-50" : "bg-slate-50"}`}>
              <span className="text-sm text-slate-600">{row.label}</span>
              <span className={`text-sm font-bold ${row.highlight === "red" ? "text-red-600" : "text-slate-900"}`}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 日別売上グラフ */}
      <div className="bg-white rounded-lg shadow p-6 overflow-visible">
        <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">日別売上</h2>
        <DailyBarChart data={dailyData} />
      </div>

      {/* 新規処方 vs 再処方 */}
      {dailyData.some(d => d.firstCount > 0 || d.reorderCount > 0) && (
        <div className="bg-white rounded-lg shadow p-6 overflow-visible">
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">新規処方 vs 再処方（日別件数）</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-emerald-50 rounded-lg text-center">
              <div className="text-emerald-600 text-xs mb-1">再処方</div>
              <div className="text-xl font-bold text-emerald-700">
                {dailyData.reduce((sum, d) => sum + d.reorderCount, 0)}件
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <div className="text-blue-600 text-xs mb-1">新規処方</div>
              <div className="text-xl font-bold text-blue-700">
                {dailyData.reduce((sum, d) => sum + d.firstCount, 0)}件
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData.filter(d => d.firstCount > 0 || d.reorderCount > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const first = payload.find(p => p.dataKey === "firstCount");
                    const reorder = payload.find(p => p.dataKey === "reorderCount");
                    return (
                      <div className="bg-white border border-slate-200 rounded shadow px-3 py-2 text-sm">
                        <div className="font-medium text-slate-900 mb-1">{String(label)}</div>
                        {reorder && <div style={{ color: "#10b981" }}>再処方：{reorder.value}件</div>}
                        {first && <div style={{ color: "#3b82f6" }}>新規処方：{first.value}件</div>}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="firstCount" name="firstCount" stackId="orders" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="reorderCount" name="reorderCount" stackId="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 売上分析 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-bold text-slate-900">売上分析</h2>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>
        </div>

        {/* タブ */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
          {analyticsTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setAnalyticsTab(t.key)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                analyticsTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {analyticsLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* 売上推移 */}
            {analyticsTab === "revenue" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <KPICard label="期間売上" value={formatYen(totalAnalyticsRevenue)} color="emerald" />
                  <KPICard label="注文件数" value={`${totalAnalyticsOrders}件`} color="blue" />
                  <KPICard label="日平均売上" value={formatYen(avgAnalyticsDaily)} color="amber" />
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-700 mb-4">日別売上推移</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsDaily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(v: unknown) => formatYen(Number(v ?? 0))}
                          labelFormatter={l => l}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Area type="monotone" dataKey="revenue" name="純売上" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* LTV分析 */}
            {analyticsTab === "ltv" && ltv && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KPICard label="平均LTV" value={formatYen(ltv.avgLtv)} color="purple" />
                  <KPICard label="平均注文回数" value={`${ltv.avgOrders}回`} color="blue" />
                  <KPICard label="総患者数" value={`${ltv.totalPatients}人`} color="emerald" />
                  <KPICard label="総売上" value={formatYen(ltv.totalRevenue)} color="amber" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">LTV分布</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ltv.distribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="count" name="患者数" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">購入回数分布</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ltv.repeatDist}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="count" name="患者数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* コホート */}
            {analyticsTab === "cohort" && (
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-4">月別コホート分析（初回購入月 → N月後の継続率）</h3>
                {cohort.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">データがありません</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="py-2 px-3 text-left text-gray-500 font-medium">初回月</th>
                          <th className="py-2 px-3 text-right text-gray-500 font-medium">人数</th>
                          {[0, 1, 2, 3, 4, 5].map(i => (
                            <th key={i} className="py-2 px-3 text-center text-gray-500 font-medium">{i === 0 ? "当月" : `${i}ヶ月後`}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cohort.map(row => (
                          <tr key={row.month} className="border-b border-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-700">{row.month}</td>
                            <td className="py-2 px-3 text-right text-gray-600">{row.size}</td>
                            {[0, 1, 2, 3, 4, 5].map(i => {
                              const ret = row.retention.find(r => r.monthOffset === i);
                              const rate = ret?.rate ?? null;
                              const bg = rate === null ? "" :
                                rate >= 80 ? "bg-emerald-100 text-emerald-800" :
                                rate >= 50 ? "bg-emerald-50 text-emerald-700" :
                                rate >= 30 ? "bg-yellow-50 text-yellow-700" :
                                rate >= 10 ? "bg-orange-50 text-orange-700" :
                                "bg-red-50 text-red-600";
                              return (
                                <td key={i} className={`py-2 px-3 text-center font-medium rounded ${bg}`}>
                                  {rate !== null ? `${rate}%` : "-"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 商品別 */}
            {analyticsTab === "products" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-700 mb-4">商品別売上</h3>
                {products.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">データがありません</p>
                ) : (
                  <>
                    <div className="h-64 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={products.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="code" tick={{ fontSize: 9 }} width={120} />
                          <Tooltip formatter={(v: unknown) => formatYen(Number(v ?? 0))} contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="revenue" name="売上" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5">
                      {products.map((p, i) => (
                        <div key={p.code} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                          <span className="text-xs font-bold text-gray-400 w-6">{i + 1}</span>
                          <span className="text-xs font-medium text-gray-800 flex-1">{p.code}</span>
                          <span className="text-xs font-bold text-emerald-700">{formatYen(p.revenue)}</span>
                          <span className="text-[10px] text-gray-400">{p.count}件</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* アクションボタン（スマホでは非表示） */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => router.push(`/admin/accounting/input?month=${selectedMonth}`)}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 border-blue-500 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">📝</span>
            <div>
              <div className="text-lg font-bold text-slate-900">月次詳細入力</div>
              <div className="text-sm text-slate-600">売上原価・経費の入力</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push(`/admin/accounting/statement?month=${selectedMonth}`)}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 border-green-500 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <div className="text-lg font-bold text-slate-900">収支表</div>
              <div className="text-sm text-slate-600">月次損益計算書</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

interface DailyBarChartProps {
  data: DailyData[];
}

function DailyBarChart({ data }: DailyBarChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-slate-500">データがありません</div>;
  }

  const maxValue = Math.max(...data.map((d) => d.square + d.bank), 1);

  return (
    <div className="overflow-x-auto overflow-y-visible">
      <div className="min-w-[800px] pt-24">
        <div className="flex items-end gap-1 h-48 border-b border-slate-200 pb-2 relative">
          {data.map((day, idx) => {
            const squareHeight = (day.square / maxValue) * 100;
            const bankHeight = (day.bank / maxValue) * 100;
            const dayNum = parseInt(day.date.split("-")[2]);
            const totalCount = day.squareCount + day.bankCount;
            const isNearLeft = idx <= 2;
            const isNearRight = idx >= data.length - 3;
            const tooltipAlign = isNearLeft ? "left-0" : isNearRight ? "right-0" : "left-1/2 -translate-x-1/2";

            return (
              <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                <div className={`absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-20 shadow-lg ${tooltipAlign}`}>
                  <div className="font-bold">{dayNum}日</div>
                  <div>カード: ¥{day.square.toLocaleString()} ({day.squareCount}件)</div>
                  <div>振込: ¥{day.bank.toLocaleString()} ({day.bankCount}件)</div>
                  {day.refund > 0 && <div className="text-red-300">返金: -¥{day.refund.toLocaleString()}</div>}
                  <div className="border-t border-slate-600 mt-1 pt-1">純売上: ¥{day.total.toLocaleString()}</div>
                  <div className="text-slate-300">計{totalCount}件</div>
                </div>
                <div className="w-full flex flex-col justify-end" style={{ height: "160px" }}>
                  {bankHeight > 0 && (
                    <div
                      className="w-full bg-green-400 rounded-t-sm"
                      style={{ height: `${bankHeight}%`, minHeight: bankHeight > 0 ? "2px" : 0 }}
                    />
                  )}
                  {squareHeight > 0 && (
                    <div
                      className="w-full bg-blue-500"
                      style={{ height: `${squareHeight}%`, minHeight: squareHeight > 0 ? "2px" : 0 }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-1 mt-1">
          {data.map((day) => {
            const dayNum = parseInt(day.date.split("-")[2]);
            const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6;
            return (
              <div
                key={day.date}
                className={`flex-1 text-center text-xs ${isWeekend ? "text-red-500" : "text-slate-500"}`}
              >
                {dayNum}
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
            <span className="text-slate-600">カード</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            <span className="text-slate-600">銀行振込</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-50 to-green-50 border-emerald-100",
    blue: "from-blue-50 to-indigo-50 border-blue-100",
    amber: "from-amber-50 to-yellow-50 border-amber-100",
    purple: "from-purple-50 to-violet-50 border-purple-100",
  };
  const textColors: Record<string, string> = {
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    purple: "text-purple-700",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl border p-4`}>
      <div className="text-[11px] text-gray-500 font-medium">{label}</div>
      <div className={`text-xl font-bold mt-1 ${textColors[color]}`}>{value}</div>
    </div>
  );
}
