import type { WidgetSettings, SSEStatus } from "../types";
import { SSEStatusIndicator } from "./ui/SSEStatusIndicator";

interface DashboardHeaderProps {
  dateRange: string;
  setDateRange: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  sseStatus: SSEStatus;
  widgetSettings: WidgetSettings;
  toggleWidget: (key: keyof WidgetSettings) => void;
  showWidgetMenu: boolean;
  setShowWidgetMenu: (v: boolean | ((prev: boolean) => boolean)) => void;
  widgetMenuRef: React.RefObject<HTMLDivElement | null>;
  rangeLabelJa: string;
}

export function DashboardHeader({
  dateRange,
  setDateRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  sseStatus,
  widgetSettings,
  toggleWidget,
  showWidgetMenu,
  setShowWidgetMenu,
  widgetMenuRef,
  rangeLabelJa,
}: DashboardHeaderProps) {
  const rangeOptions = [
    { value: "today", label: "今日" },
    { value: "yesterday", label: "昨日" },
    { value: "this_week", label: "今週" },
    { value: "last_week", label: "先週" },
    { value: "this_month", label: "今月" },
    { value: "last_month", label: "先月" },
    { value: "custom", label: "カスタム" },
  ];

  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="text-slate-400 text-sm mt-0.5">{rangeLabelJa}の運営指標</p>
        </div>
        {dateRange === "today" && (
          <SSEStatusIndicator status={sseStatus} />
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* ウィジェット表示設定ボタン */}
        <div className="relative" ref={widgetMenuRef}>
          <button
            onClick={() => setShowWidgetMenu((prev: boolean) => !prev)}
            className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
            aria-label="ウィジェット設定"
            title="ウィジェット表示設定"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {showWidgetMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-lg z-50 py-2 max-h-[70vh] overflow-y-auto">
              <div className="px-3 py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  KPIカード
                </span>
              </div>
              {([
                { key: "kpi_reservations" as const, label: "予約件数" },
                { key: "kpi_shipping" as const, label: "配送件数" },
                { key: "kpi_revenue" as const, label: "純売上" },
                { key: "kpi_repeat_rate" as const, label: "リピート率" },
                { key: "kpi_payment_rate" as const, label: "診療後の決済率" },
                { key: "kpi_reservation_rate" as const, label: "問診後の予約率" },
                { key: "kpi_consultation_rate" as const, label: "予約後の受診率" },
                { key: "kpi_line_registered" as const, label: "LINE登録者" },
                { key: "kpi_active_reservations" as const, label: "本日の予約枠" },
                { key: "kpi_avg_order" as const, label: "顧客単価" },
                { key: "kpi_today_reservations" as const, label: "本日の新規予約" },
                { key: "kpi_today_paid" as const, label: "本日の決済" },
                { key: "kpi_bank_transfer" as const, label: "銀行振込状況" },
              ]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widgetSettings[key]}
                    onChange={() => toggleWidget(key)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <span className="text-sm text-slate-600">{label}</span>
                </label>
              ))}
              <div className="px-3 py-2 border-t border-b border-slate-100 mt-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  チャート・タブ
                </span>
              </div>
              {([
                { key: "kpiTargetChart" as const, label: "KPI目標vs実績" },
                { key: "detailTabs" as const, label: "詳細タブ" },
                { key: "segmentChart" as const, label: "セグメント分布" },
                { key: "conversionChart" as const, label: "初診→再診転換率" },
              ]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widgetSettings[key]}
                    onChange={() => toggleWidget(key)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <span className="text-sm text-slate-600">{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 日付範囲セグメントコントロール */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                dateRange === opt.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {dateRange === "custom" && (
          <>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <span className="text-slate-300">〜</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </>
        )}
      </div>
    </div>
  );
}
