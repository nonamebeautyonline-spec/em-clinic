"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

  // カスタムサマリー用のstate
  const [customRange, setCustomRange] = useState("today");
  const [customStart, setCustomStart] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });

  // カスタムサマリー用SWRキー
  const customSummaryKey = useMemo(() => {
    const params = new URLSearchParams({ range: customRange });
    if (customRange === "custom") {
      params.set("start", customStart);
      params.set("end", customEnd);
    }
    return `/api/admin/dashboard-stats-enhanced?${params.toString()}`;
  }, [customRange, customStart, customEnd]);

  const { data: customStats, isLoading: customLoading } = useSWR<{
    reservations: { total: number; completed: number; cancelled: number; cancelRate: number };
    shipping: { total: number; first: number; reorder: number };
    revenue: { square: number; bankTransfer: number; gross: number; refunded: number; total: number; avgOrderAmount: number; totalOrders: number; reorderOrders: number };
    patients: { total: number; active: number; new: number; repeatRate: number };
    bankTransfer: { pending: number; confirmed: number };
    kpi: { paymentRateAfterConsultation: number; reservationRateAfterIntake: number; consultationCompletionRate: number; lineRegisteredCount: number; todayActiveReservations: number; todayNewReservations: number; todayPaidCount: number };
  }>(customSummaryKey);

  const customRangeLabel: Record<string, string> = {
    today: "今日",
    yesterday: "昨日",
    this_week: "今週",
    last_week: "先週",
    this_month: "今月",
    last_month: "先月",
    custom: "カスタム",
  };

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
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-claude-near-black">日別サマリー</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-claude-border-warm rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-claude-terracotta/30 bg-claude-parchment"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-claude-parchment/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-claude-terracotta" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
              </div>
              <span className="text-[11px] font-medium text-claude-stone">カード決済</span>
            </div>
            <div className="text-xl font-bold text-claude-near-black">¥{todaySummary.totalSquare.toLocaleString()}</div>
            <div className="text-[11px] text-claude-stone mt-1">{todaySummary.squareCount}件</div>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>
              </div>
              <span className="text-[11px] font-medium text-claude-stone">銀行振込</span>
            </div>
            <div className="text-xl font-bold text-claude-near-black">¥{todaySummary.totalBank.toLocaleString()}</div>
            <div className="text-[11px] text-claude-stone mt-1">{todaySummary.bankCount}件</div>
          </div>
          <div className="p-4 rounded-2xl bg-red-50/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
              </div>
              <span className="text-[11px] font-medium text-red-400">返金</span>
            </div>
            <div className="text-xl font-bold text-claude-error">-¥{todaySummary.totalRefund.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-2xl bg-claude-parchment">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-slate-200/60 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-claude-olive" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className="text-[11px] font-medium text-claude-stone">純売上</span>
            </div>
            <div className="text-xl font-bold text-claude-near-black">¥{todaySummary.totalNet.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 月次サマリー */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-claude-near-black">月次サマリー</h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 border border-claude-border-warm rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-claude-terracotta/30 bg-claude-parchment"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-claude-parchment/60">
            <p className="text-[11px] font-medium text-claude-stone mb-1">カード決済</p>
            <p className="text-xl font-bold text-claude-near-black">¥{dailySummary.totalSquare.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50/60">
            <p className="text-[11px] font-medium text-claude-stone mb-1">銀行振込</p>
            <p className="text-xl font-bold text-claude-near-black">¥{dailySummary.totalBank.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-2xl bg-red-50/60">
            <p className="text-[11px] font-medium text-red-400 mb-1">返金</p>
            <p className="text-xl font-bold text-claude-error">-¥{dailySummary.totalRefund.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-2xl bg-claude-parchment">
            <p className="text-[11px] font-medium text-claude-stone mb-1">純売上</p>
            <p className="text-xl font-bold text-claude-near-black">¥{dailySummary.totalNet.toLocaleString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div className="p-4 rounded-2xl bg-violet-50/60">
            <p className="text-[11px] font-medium text-claude-stone mb-1">決済数</p>
            <p className="text-xl font-bold text-claude-near-black">
              {dailySummary.totalCount.toLocaleString()}件
              <span className="text-[11px] font-normal ml-2 text-claude-stone">
                (カード{dailySummary.totalSquareCount} / 振込{dailySummary.totalBankCount})
              </span>
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50/60">
            <p className="text-[11px] font-medium text-claude-stone mb-1">顧客単価</p>
            <p className="text-xl font-bold text-claude-near-black">¥{dailySummary.avgOrderValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* カスタムサマリー — ダッシュボード風（日付範囲指定） */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
          <h2 className="text-[15px] font-semibold text-claude-near-black">カスタムサマリー</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={customRange}
              onChange={(e) => setCustomRange(e.target.value)}
              className="px-3 py-1.5 bg-claude-ivory border border-claude-ring-warm rounded-lg text-sm font-medium text-claude-charcoal focus:outline-none focus:ring-2 focus:ring-claude-terracotta/30 shadow-sm"
            >
              <option value="today">今日</option>
              <option value="yesterday">昨日</option>
              <option value="this_week">今週</option>
              <option value="last_week">先週</option>
              <option value="this_month">今月</option>
              <option value="last_month">先月</option>
              <option value="custom">カスタム</option>
            </select>
            {customRange === "custom" && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-1.5 border border-claude-ring-warm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-claude-terracotta/30"
                />
                <span className="text-claude-stone">〜</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-1.5 border border-claude-ring-warm rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-claude-terracotta/30"
                />
              </>
            )}
            {customLoading && (
              <div className="h-4 w-4 border-2 border-claude-near-black border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>

        {customStats ? (
          <>
            {/* KPIカード */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="p-4 rounded-2xl bg-claude-parchment/60">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-claude-terracotta" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                  </div>
                  <span className="text-[11px] font-medium text-claude-stone">予約件数</span>
                </div>
                <p className="text-[22px] font-bold text-claude-near-black">{customStats.reservations.total}<span className="text-sm font-normal text-claude-stone ml-1">件</span></p>
                <p className="text-[11px] text-claude-stone mt-1">診察済 {customStats.reservations.completed} / キャンセル {customStats.reservations.cancelled}</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/60">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                  <span className="text-[11px] font-medium text-claude-stone">配送件数</span>
                </div>
                <p className="text-[22px] font-bold text-claude-near-black">{customStats.shipping.total}<span className="text-sm font-normal text-claude-stone ml-1">件</span></p>
                <p className="text-[11px] text-claude-stone mt-1">新規 {customStats.shipping.first} / 再処方 {customStats.shipping.reorder}</p>
              </div>
              <div className="p-4 rounded-2xl bg-violet-50/60">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <span className="text-[11px] font-medium text-claude-stone">純売上</span>
                </div>
                <p className="text-[22px] font-bold text-claude-near-black">¥{(customStats.revenue.total || 0).toLocaleString()}</p>
                <p className="text-[11px] text-claude-stone mt-1">カード ¥{(customStats.revenue.square || 0).toLocaleString()} / 振込 ¥{(customStats.revenue.bankTransfer || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/60">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
                  </div>
                  <span className="text-[11px] font-medium text-claude-stone">顧客単価</span>
                </div>
                <p className="text-[22px] font-bold text-claude-near-black">¥{(customStats.revenue.avgOrderAmount || 0).toLocaleString()}</p>
                <p className="text-[11px] text-claude-stone mt-1">{customRangeLabel[customRange]}平均</p>
              </div>
            </div>

            {/* 転換率カード */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
              {(() => {
                const payRate = customStats.kpi.paymentRateAfterConsultation || 0;
                const resRate = customStats.kpi.reservationRateAfterIntake || 0;
                const conRate = customStats.kpi.consultationCompletionRate || 0;
                const rateColor = (r: number) => r >= 80 ? "text-emerald-500" : r >= 60 ? "text-amber-500" : "text-red-400";
                const barColor = (r: number) => r >= 80 ? "bg-emerald-400" : r >= 60 ? "bg-amber-400" : "bg-red-300";
                return (
                  <>
                    <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-5 hover:shadow-whisper transition-all duration-200">
                      <p className="text-[13px] font-medium text-claude-stone mb-3">診療後決済率</p>
                      <p className={`text-[28px] font-bold leading-none mb-3 ${rateColor(payRate)}`}>{payRate}<span className="text-lg">%</span></p>
                      <div className="w-full h-1.5 bg-claude-sand rounded-full overflow-hidden mb-2"><div className={`h-full rounded-full ${barColor(payRate)}`} style={{ width: `${Math.min(payRate, 100)}%` }} /></div>
                      <p className="text-[11px] text-claude-stone">診察完了後に決済した割合</p>
                    </div>
                    <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-5 hover:shadow-whisper transition-all duration-200">
                      <p className="text-[13px] font-medium text-claude-stone mb-3">問診後予約率</p>
                      <p className={`text-[28px] font-bold leading-none mb-3 ${rateColor(resRate)}`}>{resRate}<span className="text-lg">%</span></p>
                      <div className="w-full h-1.5 bg-claude-sand rounded-full overflow-hidden mb-2"><div className={`h-full rounded-full ${barColor(resRate)}`} style={{ width: `${Math.min(resRate, 100)}%` }} /></div>
                      <p className="text-[11px] text-claude-stone">問診完了後に予約した割合</p>
                    </div>
                    <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-5 hover:shadow-whisper transition-all duration-200">
                      <p className="text-[13px] font-medium text-claude-stone mb-3">予約後受診率</p>
                      <p className={`text-[28px] font-bold leading-none mb-3 ${rateColor(conRate)}`}>{conRate}<span className="text-lg">%</span></p>
                      <div className="w-full h-1.5 bg-claude-sand rounded-full overflow-hidden mb-2"><div className={`h-full rounded-full ${barColor(conRate)}`} style={{ width: `${Math.min(conRate, 100)}%` }} /></div>
                      <p className="text-[11px] text-claude-stone">予約後に診察完了した割合</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* ミニ統計 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "カード決済額", value: `¥${(customStats.revenue.square || 0).toLocaleString()}`, highlight: undefined as string | undefined },
                { label: "銀行振込額", value: `¥${(customStats.revenue.bankTransfer || 0).toLocaleString()}`, highlight: undefined as string | undefined },
                { label: "返金額", value: `-¥${(customStats.revenue.refunded || 0).toLocaleString()}`, highlight: (customStats.revenue.refunded || 0) > 0 ? "red" : undefined },
                { label: "リピート率", value: `${customStats.patients.repeatRate || 0}%`, highlight: undefined as string | undefined },
                { label: "新規患者", value: `${customStats.patients.new || 0}人`, highlight: undefined as string | undefined },
                { label: "振込入金待ち", value: `${customStats.bankTransfer.pending || 0}件`, highlight: (customStats.bankTransfer.pending || 0) > 0 ? "orange" : undefined },
                { label: "振込確認済み", value: `${customStats.bankTransfer.confirmed || 0}件`, highlight: undefined as string | undefined },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between p-3 rounded-xl bg-claude-parchment/70">
                  <span className="text-[13px] text-claude-stone">{row.label}</span>
                  <span className={`text-[13px] font-semibold ${row.highlight === "red" ? "text-red-500" : row.highlight === "orange" ? "text-amber-500" : "text-claude-near-black"}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12 text-claude-stone text-sm">
            {customLoading ? "読み込み中..." : "データがありません"}
          </div>
        )}
      </div>

      {/* 日別売上グラフ */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 overflow-visible">
        <h2 className="text-[15px] font-semibold text-claude-near-black mb-5">日別売上</h2>
        <DailyBarChart data={dailyData} />
      </div>

      {/* 新規処方 vs 再処方 */}
      {dailyData.some(d => d.firstCount > 0 || d.reorderCount > 0) && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 overflow-visible">
          <h2 className="text-[15px] font-semibold text-claude-near-black mb-5">新規処方 vs 再処方（日別件数）</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-2xl bg-emerald-50/60 text-center">
              <p className="text-[11px] font-medium text-claude-stone mb-1">再処方</p>
              <p className="text-xl font-bold text-claude-near-black">
                {dailyData.reduce((sum, d) => sum + d.reorderCount, 0)}件
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-claude-parchment/60 text-center">
              <p className="text-[11px] font-medium text-claude-stone mb-1">新規処方</p>
              <p className="text-xl font-bold text-claude-near-black">
                {dailyData.reduce((sum, d) => sum + d.firstCount, 0)}件
              </p>
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
                      <div className="bg-claude-ivory border border-claude-border-warm rounded shadow px-3 py-2 text-sm">
                        <div className="font-medium text-claude-near-black mb-1">{String(label)}</div>
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
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-claude-near-black">売上分析</h2>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-claude-ivory border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>
        </div>

        {/* タブ */}
        <div className="flex gap-1 bg-claude-sand rounded-xl p-1 mb-5">
          {analyticsTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setAnalyticsTab(t.key)}
              className={`px-4 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 ${
                analyticsTab === t.key ? "bg-claude-near-black text-white shadow-sm" : "text-claude-stone hover:text-claude-olive"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {analyticsLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-claude-near-black border-t-transparent" />
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
                                "bg-red-50 text-claude-error";
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
                        <div key={p.code} className="flex items-center gap-3 px-3 py-2 py-2.5 border-b border-slate-50 last:border-b-0 hover:bg-claude-sand/50 rounded-lg transition-colors">
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
          className="p-6 bg-claude-ivory rounded-2xl border border-claude-border-cream hover:shadow-sm transition-shadow text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-claude-sand rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-claude-olive" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-claude-near-black">月次詳細入力</div>
              <div className="text-sm text-claude-stone">売上原価・経費の入力</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push(`/admin/accounting/statement?month=${selectedMonth}`)}
          className="p-6 bg-claude-ivory rounded-2xl border border-claude-border-cream hover:shadow-sm transition-shadow text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-claude-sand rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-claude-olive" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-claude-near-black">収支表</div>
              <div className="text-sm text-claude-stone">月次損益計算書</div>
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
    return <div className="text-center py-8 text-claude-olive">データがありません</div>;
  }

  const maxValue = Math.max(...data.map((d) => d.square + d.bank), 1);

  return (
    <div className="overflow-x-auto overflow-y-visible">
      <div className="min-w-[800px] pt-24">
        <div className="flex items-end gap-1 h-48 border-b border-claude-border-warm pb-2 relative">
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
                <div className={`absolute bottom-full mb-2 hidden group-hover:block bg-claude-near-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-20 shadow-lg ${tooltipAlign}`}>
                  <div className="font-bold">{dayNum}日</div>
                  <div>カード: ¥{day.square.toLocaleString()} ({day.squareCount}件)</div>
                  <div>振込: ¥{day.bank.toLocaleString()} ({day.bankCount}件)</div>
                  {day.refund > 0 && <div className="text-red-300">返金: -¥{day.refund.toLocaleString()}</div>}
                  <div className="border-t border-slate-600 mt-1 pt-1">純売上: ¥{day.total.toLocaleString()}</div>
                  <div className="text-claude-ring-warm">計{totalCount}件</div>
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
                className={`flex-1 text-center text-xs ${isWeekend ? "text-red-500" : "text-claude-olive"}`}
              >
                {dayNum}
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
            <span className="text-claude-olive">カード</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            <span className="text-claude-olive">銀行振込</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, color = "emerald" }: { label: string; value: string; color?: string }) {
  const bgMap: Record<string, string> = {
    emerald: "bg-emerald-50/60",
    blue: "bg-claude-parchment/60",
    amber: "bg-amber-50/60",
    purple: "bg-violet-50/60",
  };
  return (
    <div className={`rounded-2xl p-4 ${bgMap[color] || bgMap.emerald}`}>
      <p className="text-[11px] text-claude-stone font-medium">{label}</p>
      <p className="text-xl font-bold mt-1 text-claude-near-black">{value}</p>
    </div>
  );
}
