"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

// recharts はクライアント専用のため dynamic import で SSR を回避
const ChartWidget = dynamic(
  () => import("./widgets/chart-widget"),
  { ssr: false, loading: () => <ChartWidgetSkeleton /> },
);
const SegmentWidget = dynamic(
  () => import("./widgets/segment-widget"),
  { ssr: false, loading: () => <SegmentWidgetSkeleton /> },
);
const ConversionWidget = dynamic(
  () => import("./widgets/conversion-widget"),
  { ssr: false, loading: () => <ChartWidgetSkeleton /> },
);
const LTVWidget = dynamic(
  () => import("./widgets/ltv-widget"),
  { ssr: false, loading: () => <ChartWidgetSkeleton /> },
);

// ウィジェット読み込み中のスケルトン
function ChartWidgetSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 animate-pulse">
      <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
      <div className="h-64 bg-slate-100 rounded" />
    </div>
  );
}

function SegmentWidgetSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 animate-pulse">
      <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
      <div className="h-48 bg-slate-100 rounded" />
    </div>
  );
}

// ウィジェット表示設定の型
interface WidgetSettings {
  revenueChart: boolean;   // 売上推移グラフ
  orderChart: boolean;     // 新規vs再処方グラフ
  segmentChart: boolean;   // セグメント分布
  conversionChart: boolean; // 初診→再診転換率
  ltvChart: boolean;        // LTV分析
}

const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  revenueChart: true,
  orderChart: true,
  segmentChart: true,
  conversionChart: true,
  ltvChart: true,
};

const WIDGET_STORAGE_KEY = "dashboard-widget-settings";

/** localStorage からウィジェット設定を読み込む */
function loadWidgetSettings(): WidgetSettings {
  if (typeof window === "undefined") return DEFAULT_WIDGET_SETTINGS;
  try {
    const raw = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGET_SETTINGS;
    return { ...DEFAULT_WIDGET_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_WIDGET_SETTINGS;
  }
}

/** localStorage にウィジェット設定を保存する */
function saveWidgetSettings(settings: WidgetSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    // localStorage がフルの場合等はログ出力
    console.error("[dashboard] レイアウト保存失敗:", e);
  }
}

// 日別売上データの型（API レスポンス）
interface DailyBreakdown {
  date: string;
  square: number;
  bankTransfer: number;
  firstOrders: number;
  reorders: number;
}

interface DashboardStats {
  reservations: {
    total: number;
    completed: number;
    cancelled: number;
    cancelRate: number;
    consultationCompletionRate: number;
  };
  shipping: {
    total: number;
    first: number;
    reorder: number;
    pending: number;
    delayed: number;
  };
  revenue: {
    square: number;
    bankTransfer: number;
    gross: number;
    refunded: number;
    refundCount: number;
    total: number;
    avgOrderAmount: number;
  };
  products: {
    code: string;
    name: string;
    count: number;
    revenue: number;
  }[];
  patients: {
    total: number;
    active: number;
    new: number;
    repeatRate: number;
  };
  bankTransfer: {
    pending: number;
    confirmed: number;
  };
  kpi: {
    paymentRateAfterConsultation: number;
    reservationRateAfterIntake: number;
    consultationCompletionRate: number;
    lineRegisteredCount: number;
    todayNewReservations: number;
    todayPaidCount: number;
  };
  dailyBreakdown?: DailyBreakdown[];
}

type TabType = "overview" | "reservations" | "revenue" | "patients";

// SSE接続状態
type SSEStatus = "connected" | "connecting" | "disconnected";

// トースト通知の型
interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: "reservation" | "payment" | "patient";
  timestamp: Date;
}

export default function EnhancedDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // ウィジェット表示設定
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(DEFAULT_WIDGET_SETTINGS);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const widgetMenuRef = useRef<HTMLDivElement>(null);

  // 初期読み込み時に localStorage から復元
  useEffect(() => {
    setWidgetSettings(loadWidgetSettings());
  }, []);

  // ウィジェット設定の変更ハンドラ
  const toggleWidget = useCallback((key: keyof WidgetSettings) => {
    setWidgetSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveWidgetSettings(next);
      return next;
    });
  }, []);

  // メニュー外クリックで閉じるハンドラ
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (widgetMenuRef.current && !widgetMenuRef.current.contains(e.target as Node)) {
      setShowWidgetMenu(false);
    }
  }, []);

  useEffect(() => {
    if (showWidgetMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showWidgetMenu, handleClickOutside]);

  // SSE関連のstate
  const [sseStatus, setSSEStatus] = useState<SSEStatus>("disconnected");
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // リアルタイム統計
  const [realtimeStats, setRealtimeStats] = useState({
    activeAdminSessions: 0,
    todayMessageCount: 0,
    todayNewPatients: 0,
  });

  // セットアップ状態
  const [setupComplete, setSetupComplete] = useState(true);
  useEffect(() => {
    fetch("/api/admin/setup-status", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.setupComplete !== undefined) setSetupComplete(data.setupComplete);
      })
      .catch(() => {});
  }, []);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // カスタム日付範囲のバリデーション
      if (dateRange === "custom" && startDate && endDate && startDate > endDate) {
        setError("開始日は終了日より前に設定してください");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({ range: dateRange });
      if (dateRange === "custom" && startDate && endDate) {
        params.append("start", startDate);
        params.append("end", endDate);
      }

      const res = await fetch(`/api/admin/dashboard-stats-enhanced?${params}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("データ取得失敗");
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [dateRange, startDate, endDate]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // デバウンス用: SSEイベントで頻繁にloadStatsが呼ばれるのを防ぐ
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedLoadStats = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      loadStats();
    }, 3000);
  }, [loadStats]);

  // SSE接続管理
  useEffect(() => {
    if (dateRange !== "today") {
      disconnectSSE();
      return;
    }

    connectSSE();

    return () => {
      disconnectSSE();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  /**
   * SSE接続を開始
   */
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setSSEStatus("connecting");

    const es = new EventSource("/api/admin/dashboard-sse", {
      withCredentials: true,
    });
    eventSourceRef.current = es;

    es.onopen = () => {
      setSSEStatus("connected");
    };

    // 予約更新イベント（デバウンス付きリロード）
    es.addEventListener("reservation_update", (e) => {
      try {
        const data = JSON.parse(e.data);
        debouncedLoadStats();

        const diff = data.diff || 0;
        const cancelDiff = data.cancelDiff || 0;
        if (diff > 0) {
          addToast({
            title: "新しい予約",
            message: `${diff}件の予約が追加されました`,
            type: "reservation",
          });
        }
        if (cancelDiff > 0) {
          addToast({
            title: "予約キャンセル",
            message: `${cancelDiff}件の予約がキャンセルされました`,
            type: "reservation",
          });
        }
      } catch {
        // パースエラーは無視
      }
    });

    // 決済更新イベント
    es.addEventListener("payment_update", (e) => {
      try {
        const data = JSON.parse(e.data);
        debouncedLoadStats();

        const diff = data.diff || 0;
        if (diff > 0) {
          addToast({
            title: "決済完了",
            message: `${diff}件の決済が完了しました`,
            type: "payment",
          });
        }
      } catch {
        // パースエラーは無視
      }
    });

    // 新規患者イベント
    es.addEventListener("new_patient", (e) => {
      try {
        const data = JSON.parse(e.data);
        debouncedLoadStats();

        const diff = data.diff || 0;
        if (diff > 0) {
          addToast({
            title: "新規患者",
            message: `${diff}名の新規患者が登録されました`,
            type: "patient",
          });
        }
      } catch {
        // パースエラーは無視
      }
    });

    // リアルタイム統計更新イベント
    es.addEventListener("stats_update", (e) => {
      try {
        const data = JSON.parse(e.data);
        setRealtimeStats({
          activeAdminSessions: data.activeAdminSessions ?? 0,
          todayMessageCount: data.todayMessageCount ?? 0,
          todayNewPatients: data.todayNewPatients ?? 0,
        });
      } catch {
        // パースエラーは無視
      }
    });

    // ping（接続維持 + 初回スナップショットからリアルタイム統計取得）
    es.addEventListener("ping", (e) => {
      setSSEStatus("connected");
      try {
        const data = JSON.parse(e.data);
        if (data.snapshot) {
          setRealtimeStats({
            activeAdminSessions: data.snapshot.activeAdminSessions ?? 0,
            todayMessageCount: data.snapshot.todayMessageCount ?? 0,
            todayNewPatients: data.snapshot.todayNewPatients ?? 0,
          });
        }
      } catch {
        // パースエラーは無視
      }
    });

    // エラー・切断時の再接続
    es.onerror = () => {
      setSSEStatus("connecting");
      es.close();
      eventSourceRef.current = null;

      reconnectTimerRef.current = setTimeout(() => {
        connectSSE();
      }, 3000);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * SSE切断
   */
  const disconnectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setSSEStatus("disconnected");
  }, []);

  /**
   * トースト通知を追加
   */
  const addToast = useCallback(
    (toast: Omit<ToastNotification, "id" | "timestamp">) => {
      const notification: ToastNotification = {
        ...toast,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
      };
      setToasts((prev) => [...prev, notification]);

      // 8秒後に自動削除
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== notification.id));
      }, 8000);
    },
    [],
  );

  /**
   * トースト通知を削除
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
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
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ダッシュボード</h1>
            <p className="text-slate-500 text-sm mt-1">{getRangeLabelJa()}の運営指標</p>
          </div>
          {/* SSE接続状態インジケーター */}
          {dateRange === "today" && (
            <SSEStatusIndicator status={sseStatus} />
          )}
        </div>

        {/* 日付選択 + ウィジェット設定 */}
        <div className="flex items-center gap-3">
          {/* ウィジェット表示設定ボタン */}
          <div className="relative" ref={widgetMenuRef}>
            <button
              onClick={() => setShowWidgetMenu((prev) => !prev)}
              className="p-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
              aria-label="ウィジェット設定"
              title="ウィジェット表示設定"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* ドロップダウンメニュー */}
            {showWidgetMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-2">
                <div className="px-3 py-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ウィジェット表示
                  </span>
                </div>
                <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widgetSettings.revenueChart}
                    onChange={() => toggleWidget("revenueChart")}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">売上推移グラフ</span>
                </label>
                <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widgetSettings.orderChart}
                    onChange={() => toggleWidget("orderChart")}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">新規vs再処方グラフ</span>
                </label>
                <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widgetSettings.segmentChart}
                    onChange={() => toggleWidget("segmentChart")}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">セグメント分布</span>
                </label>
                <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widgetSettings.conversionChart}
                    onChange={() => toggleWidget("conversionChart")}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">初診→再診転換率</span>
                </label>
                <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widgetSettings.ltvChart}
                    onChange={() => toggleWidget("ltvChart")}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">LTV分析</span>
                </label>
              </div>
            )}
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          >
            <option value="today">今日</option>
            <option value="yesterday">昨日</option>
            <option value="this_week">今週</option>
            <option value="last_week">先週</option>
            <option value="this_month">今月</option>
            <option value="last_month">先月</option>
            <option value="custom">カスタム</option>
          </select>

          {dateRange === "custom" && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400">〜</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
        </div>
      </div>

      {/* セットアップバナー（LINE未設定時） */}
      {!setupComplete && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">LINE Messaging APIの設定が完了していません</p>
                <p className="text-xs text-amber-700">全機能を利用するために設定を完了してください</p>
              </div>
            </div>
            <a
              href="/admin/settings?section=line"
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
            >
              設定する
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700">
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
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="emerald"
            connected={sseStatus === "connected"}
          />
          <RealtimeStatCard
            label="本日メッセージ数"
            value={realtimeStats.todayMessageCount}
            unit="件"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            }
            color="blue"
            connected={sseStatus === "connected"}
          />
          <RealtimeStatCard
            label="本日新規患者"
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

      {/* メインKPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="純売上"
          value={`¥${(stats?.revenue.total || 0).toLocaleString()}`}
          subtitle="返金後の金額"
          icon="💰"
          color="blue"
        />
        <KPICard
          title="LINE登録者"
          value={`${stats?.kpi.lineRegisteredCount || 0}`}
          subtitle="LINE友だち数"
          icon="💬"
          color="green"
        />
        <KPICard
          title="本日の予約"
          value={`${stats?.kpi.todayNewReservations || 0}`}
          subtitle="新規予約数"
          icon="📅"
          color="purple"
        />
        <KPICard
          title="本日の決済"
          value={`${stats?.kpi.todayPaidCount || 0}`}
          subtitle="決済完了数"
          icon="✅"
          color="orange"
        />
      </div>

      {/* 転換率KPI */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">転換率</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ConversionCard
            title="診療後の決済率"
            rate={stats?.kpi.paymentRateAfterConsultation || 0}
            description="診察完了後に決済した患者の割合"
          />
          <ConversionCard
            title="問診後の予約率"
            rate={stats?.kpi.reservationRateAfterIntake || 0}
            description="問診完了後に予約した患者の割合"
          />
          <ConversionCard
            title="予約後の受診率"
            rate={stats?.kpi.consultationCompletionRate || 0}
            description="予約後に診察を完了した患者の割合"
          />
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              label="概要"
            />
            <TabButton
              active={activeTab === "reservations"}
              onClick={() => setActiveTab("reservations")}
              label="予約・配送"
            />
            <TabButton
              active={activeTab === "revenue"}
              onClick={() => setActiveTab("revenue")}
              label="売上・商品"
            />
            <TabButton
              active={activeTab === "patients"}
              onClick={() => setActiveTab("patients")}
              label="患者"
            />
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 売上 */}
                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-4">売上</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <span className="text-sm font-medium text-blue-900">純売上</span>
                        <div className="text-xs text-blue-600">返金後の金額</div>
                      </div>
                      <span className="text-2xl font-bold text-blue-900">
                        ¥{(stats?.revenue.total || 0).toLocaleString()}
                      </span>
                    </div>
                    <StatRow label="総売上" value={`¥${(stats?.revenue.gross || 0).toLocaleString()}`} />
                    <StatRow label="カード決済" value={`¥${(stats?.revenue.square || 0).toLocaleString()}`} />
                    <StatRow label="銀行振込" value={`¥${(stats?.revenue.bankTransfer || 0).toLocaleString()}`} />
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-600">返金</span>
                      <span className="text-sm font-bold text-red-600">
                        -¥{(stats?.revenue.refunded || 0).toLocaleString()} ({stats?.revenue.refundCount || 0}件)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 銀行振込状況 */}
                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-4">銀行振込状況</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="text-sm font-medium text-yellow-900">入金待ち</span>
                      <span className="text-2xl font-bold text-yellow-900">
                        {stats?.bankTransfer.pending || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-sm font-medium text-green-900">確認済み</span>
                      <span className="text-2xl font-bold text-green-900">
                        {stats?.bankTransfer.confirmed || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* クイック統計 */}
                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-4">その他統計</h3>
                  <div className="space-y-3">
                    <StatRow label="リピート率" value={`${stats?.patients.repeatRate || 0}%`} />
                    <StatRow label="総患者数" value={`${stats?.patients.total || 0}人`} />
                    <StatRow label="新規患者" value={`${stats?.patients.new || 0}人`} />
                    <StatRow label="キャンセル率" value={`${stats?.reservations.cancelRate || 0}%`} />
                  </div>
                </div>
              </div>

              {/* 売上推移グラフ（ウィジェット設定で表示/非表示を切り替え） */}
              {(widgetSettings.revenueChart || widgetSettings.orderChart) &&
                stats?.dailyBreakdown &&
                stats.dailyBreakdown.length > 0 && (
                <ChartWidget
                  dailyBreakdown={stats.dailyBreakdown}
                  showRevenueChart={widgetSettings.revenueChart}
                  showOrderChart={widgetSettings.orderChart}
                />
              )}
            </div>
          )}

          {activeTab === "reservations" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-bold text-slate-900 mb-4">予約</h3>
                <div className="space-y-3">
                  <StatRow label="総予約数" value={`${stats?.reservations.total || 0}件`} />
                  <StatRow label="完了" value={`${stats?.reservations.completed || 0}件`} />
                  <StatRow label="キャンセル" value={`${stats?.reservations.cancelled || 0}件`} />
                  <StatRow
                    label="キャンセル率"
                    value={`${stats?.reservations.cancelRate || 0}%`}
                    highlight="red"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-md font-bold text-slate-900 mb-4">配送</h3>
                <div className="space-y-3">
                  <StatRow label="総配送数" value={`${stats?.shipping.total || 0}件`} />
                  <StatRow label="新規" value={`${stats?.shipping.first || 0}件`} />
                  <StatRow label="再処方" value={`${stats?.shipping.reorder || 0}件`} />
                  <StatRow
                    label="未発送"
                    value={`${stats?.shipping.pending || 0}件`}
                    highlight="orange"
                  />
                  <StatRow
                    label="遅延"
                    value={`${stats?.shipping.delayed || 0}件`}
                    highlight="red"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "revenue" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                  <div className="text-xs font-medium text-blue-600 mb-1">純売上</div>
                  <div className="text-xs text-blue-500 mb-2">返金後の金額</div>
                  <div className="text-2xl font-bold text-blue-700">
                    ¥{(stats?.revenue.total || 0).toLocaleString()}
                  </div>
                </div>
                <StatCard label="総売上" value={`¥${(stats?.revenue.gross || 0).toLocaleString()}`} />
                <StatCard label="カード決済" value={`¥${(stats?.revenue.square || 0).toLocaleString()}`} />
                <StatCard label="銀行振込" value={`¥${(stats?.revenue.bankTransfer || 0).toLocaleString()}`} />
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
                  <div className="text-xs font-medium text-red-600 mb-2">返金</div>
                  <div className="text-2xl font-bold text-red-600">
                    -¥{(stats?.revenue.refunded || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-red-500 mt-1">{stats?.revenue.refundCount || 0}件</div>
                </div>
              </div>

              <div>
                <h3 className="text-md font-bold text-slate-900 mb-4">商品別売上</h3>
                <div className="space-y-2">
                  {stats?.products.map((product) => (
                    <div
                      key={product.code}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-900">{product.name}</div>
                        <div className="text-xs text-slate-500">{product.code}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-md font-bold text-slate-900">
                          ¥{product.revenue.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">{product.count}件</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "patients" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-4">患者統計</h3>
                  <div className="space-y-3">
                    <StatRow label="総患者数" value={`${stats?.patients.total || 0}人`} />
                    <StatRow label="アクティブ患者" value={`${stats?.patients.active || 0}人`} />
                    <StatRow label="新規患者" value={`${stats?.patients.new || 0}人`} />
                    <StatRow
                      label="リピート率"
                      value={`${stats?.patients.repeatRate || 0}%`}
                      highlight="green"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-4">エンゲージメント</h3>
                  <div className="space-y-3">
                    <StatRow label="LINE登録者" value={`${stats?.kpi.lineRegisteredCount || 0}人`} />
                    <StatRow
                      label="問診後の予約率"
                      value={`${stats?.kpi.reservationRateAfterIntake || 0}%`}
                    />
                    <StatRow
                      label="予約後の受診率"
                      value={`${stats?.kpi.consultationCompletionRate || 0}%`}
                    />
                  </div>
                </div>

                {/* セグメント分布（ウィジェット設定で表示/非表示を切り替え） */}
                {widgetSettings.segmentChart && <SegmentWidget />}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 分析ウィジェット */}
      <div className="mt-8 space-y-6">
        {widgetSettings.conversionChart && <ConversionWidget />}
        {widgetSettings.ltvChart && <LTVWidget />}
      </div>

      {/* トースト通知コンテナ */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

// ─── リアルタイム統計カード ───────────────────────────────

interface RealtimeStatCardProps {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "violet";
  connected: boolean;
}

function RealtimeStatCard({ label, value, unit, icon, color, connected }: RealtimeStatCardProps) {
  const colorMap = {
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-600",
      value: "text-emerald-700",
      pulse: "bg-emerald-500",
    },
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      iconBg: "bg-blue-100 text-blue-600",
      value: "text-blue-700",
      pulse: "bg-blue-500",
    },
    violet: {
      bg: "bg-violet-50",
      border: "border-violet-200",
      iconBg: "bg-violet-100 text-violet-600",
      value: "text-violet-700",
      pulse: "bg-violet-500",
    },
  };
  const c = colorMap[color];

  return (
    <div className={`relative ${c.bg} border ${c.border} rounded-xl p-4 flex items-center gap-4 transition-all`}>
      {/* SSEライブインジケーター */}
      {connected && (
        <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.pulse} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${c.pulse}`} />
        </span>
      )}
      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${c.iconBg}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className={`text-2xl font-bold ${c.value}`}>
          {value.toLocaleString()}
          <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
        </div>
      </div>
    </div>
  );
}

// ─── SSE接続状態インジケーター ─────────────────────────────

interface SSEStatusIndicatorProps {
  status: SSEStatus;
}

function SSEStatusIndicator({ status }: SSEStatusIndicatorProps) {
  const config = {
    connected: {
      dotClass: "bg-green-500",
      label: "リアルタイム",
      containerClass: "bg-green-50 text-green-700 border-green-200",
    },
    connecting: {
      dotClass: "bg-yellow-500 animate-pulse",
      label: "再接続中...",
      containerClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
    disconnected: {
      dotClass: "bg-slate-400",
      label: "オフライン",
      containerClass: "bg-slate-50 text-slate-500 border-slate-200",
    },
  };

  const { dotClass, label, containerClass } = config[status];

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${containerClass}`}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
      {label}
    </div>
  );
}

// ─── トースト通知 ─────────────────────────────────────────

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

interface ToastProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
  const iconMap = {
    reservation: "📅",
    payment: "💳",
    patient: "👤",
  };

  const borderColorMap = {
    reservation: "border-l-purple-500",
    payment: "border-l-blue-500",
    patient: "border-l-green-500",
  };

  const timeAgo = getTimeAgo(toast.timestamp);

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border border-slate-200 border-l-4 ${borderColorMap[toast.type]} p-4 animate-slide-in-right min-w-[280px]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5">{iconMap[toast.type]}</span>
          <div>
            <div className="text-sm font-semibold text-slate-900">{toast.title}</div>
            <div className="text-xs text-slate-600 mt-0.5">{toast.message}</div>
            <div className="text-xs text-slate-400 mt-1">{timeAgo}</div>
          </div>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * 経過時間を「〜秒前」「〜分前」の形式で返す
 */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分前`;
  return `${Math.floor(minutes / 60)}時間前`;
}

// ─── 既存のUI部品（変更なし） ──────────────────────────────

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: "blue" | "green" | "purple" | "orange";
}

function KPICard({ title, value, subtitle, icon, color }: KPICardProps) {
  const colorClasses = {
    blue: "border-blue-500 bg-blue-50",
    green: "border-green-500 bg-green-50",
    purple: "border-purple-500 bg-purple-50",
    orange: "border-orange-500 bg-orange-50",
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-slate-600">{title}</div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}

interface ConversionCardProps {
  title: string;
  rate: number;
  description: string;
}

function ConversionCard({ title, rate, description }: ConversionCardProps) {
  const getRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-lg shadow-sm p-6 border border-slate-200">
      <div className="text-sm font-medium text-slate-600 mb-3">{title}</div>
      <div className={`text-4xl font-bold mb-2 ${getRateColor(rate)}`}>{rate}%</div>
      <div className="text-xs text-slate-500">{description}</div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-500 text-blue-600"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  highlight?: "red" | "orange" | "green";
}

function StatRow({ label, value, highlight }: StatRowProps) {
  const highlightClasses = {
    red: "text-red-600",
    orange: "text-orange-600",
    green: "text-green-600",
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-bold ${highlight ? highlightClasses[highlight] : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 border border-slate-200">
      <div className="text-xs font-medium text-slate-500 mb-2">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
