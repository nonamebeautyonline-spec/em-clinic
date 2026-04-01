"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import useSWR, { mutate } from "swr";
import dynamic from "next/dynamic";
import OnboardingChecklist from "@/components/admin/OnboardingChecklist";
import type { DashboardStats, TabType } from "./types";
import { useWidgetSettings } from "./hooks/useWidgetSettings";
import { useSSEConnection } from "./hooks/useSSEConnection";
import { DashboardHeader } from "./components/DashboardHeader";
import { KPICardGrid } from "./components/KPICardGrid";
import { DashboardDetailTabs } from "./components/DashboardDetailTabs";
import { RealtimeStatCard } from "./components/RealtimeStatCard";
import { ToastContainer } from "./components/ui/ToastContainer";

// recharts はクライアント専用のため dynamic import で SSR を回避
const ConversionWidget = dynamic(
  () => import("./widgets/conversion-widget"),
  { ssr: false, loading: () => <ChartWidgetSkeleton /> },
);
const KPITargetWidget = dynamic(
  () => import("./widgets/kpi-target-widget"),
  { ssr: false, loading: () => <ChartWidgetSkeleton /> },
);
const PieChartsWidget = dynamic(
  () => import("./widgets/pie-charts-widget"),
  { ssr: false, loading: () => <ChartWidgetSkeleton /> },
);

// ウィジェット読み込み中のスケルトン
function ChartWidgetSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
      <div className="h-4 w-32 bg-slate-100 rounded mb-4" />
      <div className="h-64 bg-slate-50 rounded" />
    </div>
  );
}

export default function EnhancedDashboard() {
  // 日付範囲
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // ウィジェット設定
  const {
    widgetSettings,
    cardOrder,
    showWidgetMenu,
    setShowWidgetMenu,
    widgetMenuRef,
    sensors,
    toggleWidget,
    handleDragEnd,
  } = useWidgetSettings();

  // オンボーディングチェックリスト
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return true;
    return !localStorage.getItem("onboarding_dismissed_at");
  });

  // カスタム日付範囲のバリデーション
  const customDateError = dateRange === "custom" && startDate && endDate && startDate > endDate
    ? "開始日は終了日より前に設定してください"
    : "";

  // SWRキーを構築（バリデーションエラー時はnullでフェッチしない）
  const statsSwrKey = useMemo(() => {
    if (customDateError) return null;
    const params = new URLSearchParams({ range: dateRange });
    if (dateRange === "custom" && startDate && endDate) {
      params.append("start", startDate);
      params.append("end", endDate);
    }
    return `/api/admin/dashboard-stats-enhanced?${params}`;
  }, [dateRange, startDate, endDate, customDateError]);

  const { data: statsData, error: statsError, isLoading: statsLoading } = useSWR<DashboardStats>(statsSwrKey);

  // SWRデータから直接導出（useEffect不要）
  const stats = statsData ?? null;
  const loading = statsLoading;
  const error = customDateError || (statsError ? (statsError instanceof Error ? statsError.message : "エラーが発生しました") : "");

  const loadStats = useCallback(() => {
    if (statsSwrKey) mutate(statsSwrKey);
  }, [statsSwrKey]);

  // デバウンス用: SSEイベントで頻繁にloadStatsが呼ばれるのを防ぐ
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedLoadStats = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      loadStats();
    }, 3000);
  }, [loadStats]);

  // SSE接続
  const {
    sseStatus,
    toasts,
    realtimeStats,
    removeToast,
  } = useSSEConnection(dateRange, debouncedLoadStats);

  // reloadTimerのクリーンアップ
  useEffect(() => {
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-900 border-t-transparent"></div>
          <p className="mt-4 text-slate-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  const getRangeLabelJa = () => {
    const labels: Record<string, string> = {
      today: "今日",
      yesterday: "昨日",
      this_week: "今週",
      last_week: "先週",
      this_month: "今月",
      last_month: "先月",
      custom: `${startDate} 〜 ${endDate}`,
    };
    return labels[dateRange] || "今日";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <DashboardHeader
        dateRange={dateRange}
        setDateRange={setDateRange}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        sseStatus={sseStatus}
        widgetSettings={widgetSettings}
        toggleWidget={toggleWidget}
        showWidgetMenu={showWidgetMenu}
        setShowWidgetMenu={setShowWidgetMenu}
        widgetMenuRef={widgetMenuRef}
        rangeLabelJa={getRangeLabelJa()}
      />

      {/* オンボーディングチェックリスト */}
      {showOnboarding && (
        <OnboardingChecklist onDismiss={() => setShowOnboarding(false)} />
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* リアルタイム統計 */}
      {dateRange === "today" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <RealtimeStatCard
            label="オンライン管理者"
            value={realtimeStats.activeAdminSessions}
            unit="人"
            subText={realtimeStats.activeAdminNames.length > 0 ? realtimeStats.activeAdminNames.join("、") : undefined}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="emerald"
            connected={sseStatus === "connected"}
          />
          <RealtimeStatCard
            label="送信メッセージ"
            value={realtimeStats.todayOutgoingCount}
            unit="件"
            subText={`受信 ${realtimeStats.todayIncomingCount.toLocaleString()} / 合計 ${realtimeStats.todayMessageCount.toLocaleString()}`}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            }
            color="blue"
            connected={sseStatus === "connected"}
          />
          <RealtimeStatCard
            label="本日の新規登録"
            value={realtimeStats.todayNewPatients}
            unit="人"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            }
            color="violet"
            connected={sseStatus === "connected"}
          />
        </div>
      )}

      {/* 円グラフ（患者ファネル・処方内訳・決済方法） */}
      <div className="mb-6">
        <PieChartsWidget />
      </div>

      {/* KPIカード（ドラッグ並び替え対応） */}
      <KPICardGrid
        stats={stats}
        dateRange={dateRange}
        widgetSettings={widgetSettings}
        cardOrder={cardOrder}
        sensors={sensors}
        handleDragEnd={handleDragEnd}
      />

      {/* KPI目標 vs 実績 */}
      {widgetSettings.kpiTargetChart && (
        <div className="mb-8">
          <KPITargetWidget />
        </div>
      )}

      {/* タブナビゲーション */}
      {widgetSettings.detailTabs && (
        <DashboardDetailTabs
          stats={stats}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          widgetSettings={widgetSettings}
        />
      )}

      {/* 分析ウィジェット */}
      <div className="mt-8 space-y-6">
        {widgetSettings.conversionChart && <ConversionWidget />}
      </div>

      {/* トースト通知コンテナ */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
