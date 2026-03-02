"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// カレンダービューをdynamic importでSSR回避
const CalendarView = dynamic(() => import("./calendar-view"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-12">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
    </div>
  ),
});

type ViewMode = "schedule" | "calendar";

export default function ReservationsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("schedule");

  return (
    <div className="max-w-[1400px] mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          {viewMode === "schedule" ? "予約スケジュール" : "予約カレンダー"}
        </h1>
        {/* ビュー切替タブ */}
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("schedule")}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === "schedule"
                ? "bg-white text-slate-900 shadow-sm font-medium"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            スケジュール
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === "calendar"
                ? "bg-white text-slate-900 shadow-sm font-medium"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            カレンダー
          </button>
        </div>
      </div>

      {viewMode === "schedule" ? (
        <CalendarView initialMode="day" showModeSwitch={false} />
      ) : (
        <CalendarView />
      )}
    </div>
  );
}
