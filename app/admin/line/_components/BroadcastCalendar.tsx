"use client";

import { useState, useMemo } from "react";

// ── 型定義 ──────────────────────────────────────────────

interface Broadcast {
  id: number;
  name: string;
  message_content: string;
  status: string;
  total_targets: number;
  sent_count: number;
  failed_count: number;
  no_uid_count: number;
  created_at: string;
  sent_at: string | null;
  scheduled_at?: string | null;
}

interface BroadcastCalendarProps {
  broadcasts: Broadcast[];
  statusConfig: Record<string, { text: string; bg: string; text_color: string; dot: string }>;
}

// ── ヘルパー関数 ──────────────────────────────────────────

/** 指定月の日数を取得 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 指定月の1日の曜日（0=日曜）*/
function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** 日付を YYYY-MM-DD 形式に変換 */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Broadcastの表示日を取得（予約配信はscheduled_at、それ以外はcreated_at） */
function getBroadcastDateKey(b: Broadcast): string {
  const dateStr = b.scheduled_at || b.sent_at || b.created_at;
  const d = new Date(dateStr);
  return toDateKey(d);
}

/** 日付をフォーマット */
function formatDateTime(s: string): string {
  const d = new Date(s);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── 曜日ラベル ──────────────────────────────────────────

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// ── メインコンポーネント ──────────────────────────────────

export default function BroadcastCalendar({ broadcasts, statusConfig }: BroadcastCalendarProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 配信を日付ごとにグルーピング
  const broadcastsByDate = useMemo(() => {
    const map = new Map<string, Broadcast[]>();
    for (const b of broadcasts) {
      const key = getBroadcastDateKey(b);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [broadcasts]);

  // カレンダーグリッド生成
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfWeek(currentYear, currentMonth);

    // 前月の埋め草
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    const cells: { date: number; month: number; year: number; isCurrentMonth: boolean; dateKey: string }[] = [];

    // 前月
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      cells.push({
        date: day,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
        dateKey: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      });
    }

    // 当月
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: d,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        dateKey: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    // 次月の埋め草（6行×7列 = 42セル）
    const remaining = 42 - cells.length;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        date: d,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
        dateKey: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  // 月ナビゲーション
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(toDateKey(today));
  };

  const todayKey = toDateKey(today);

  // 選択日の配信一覧
  const selectedBroadcasts = selectedDate ? (broadcastsByDate.get(selectedDate) || []) : [];

  return (
    <div className="space-y-4">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-base font-bold text-gray-900 min-w-[120px] text-center">
            {currentYear}年{currentMonth + 1}月
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          今日
        </button>
      </div>

      {/* カレンダーグリッド */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={`py-2.5 text-center text-[11px] font-semibold ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日付セル */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, idx) => {
            const dayBroadcasts = broadcastsByDate.get(cell.dateKey) || [];
            const isToday = cell.dateKey === todayKey;
            const isSelected = cell.dateKey === selectedDate;
            const dayOfWeek = idx % 7;

            return (
              <button
                key={`${cell.dateKey}-${idx}`}
                onClick={() => setSelectedDate(isSelected ? null : cell.dateKey)}
                className={`
                  relative min-h-[72px] md:min-h-[84px] p-1.5 border-b border-r border-gray-50 text-left
                  transition-all duration-150
                  ${cell.isCurrentMonth ? "bg-white" : "bg-gray-50/50"}
                  ${isSelected ? "ring-2 ring-inset ring-orange-400 bg-orange-50/30" : "hover:bg-gray-50"}
                `}
              >
                {/* 日付数字 */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                      inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                      ${isToday ? "bg-orange-500 text-white" : ""}
                      ${!isToday && cell.isCurrentMonth ? (dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : "text-gray-700") : ""}
                      ${!isToday && !cell.isCurrentMonth ? "text-gray-300" : ""}
                    `}
                  >
                    {cell.date}
                  </span>
                  {dayBroadcasts.length > 0 && (
                    <span className="text-[9px] font-medium text-gray-400 mr-0.5">
                      {dayBroadcasts.length}件
                    </span>
                  )}
                </div>

                {/* 配信インジケーター */}
                <div className="space-y-0.5">
                  {dayBroadcasts.slice(0, 2).map((b) => {
                    const st = statusConfig[b.status] || { text: b.status, dot: "bg-gray-400" };
                    return (
                      <div
                        key={b.id}
                        className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                        <span className={`truncate ${cell.isCurrentMonth ? "text-gray-600" : "text-gray-400"}`}>
                          {b.name || "無題"}
                        </span>
                      </div>
                    );
                  })}
                  {dayBroadcasts.length > 2 && (
                    <div className="text-[9px] text-gray-400 px-1">
                      +{dayBroadcasts.length - 2}件
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択日の配信一覧 */}
      {selectedDate && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-700">
                {selectedDate.replace(/-/g, "/")} の配信
              </h4>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {selectedBroadcasts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400">この日の配信はありません</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {selectedBroadcasts.map((b) => {
                const st = statusConfig[b.status] || { text: b.status, bg: "bg-gray-50", text_color: "text-gray-600", dot: "bg-gray-400" };
                const rate = b.total_targets > 0 ? Math.round((b.sent_count / b.total_targets) * 100) : 0;
                return (
                  <div key={b.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    {/* 上段: 名前 + ステータス */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 text-sm truncate">
                          {b.name || "無題の配信"}
                        </h5>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-400">
                            作成: {formatDateTime(b.created_at)}
                          </span>
                          {b.scheduled_at && (
                            <span className="text-[11px] text-blue-500">
                              予約: {formatDateTime(b.scheduled_at)}
                            </span>
                          )}
                          {b.sent_at && (
                            <span className="text-[11px] text-emerald-500">
                              送信: {formatDateTime(b.sent_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium ${st.bg} ${st.text_color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.text}
                      </span>
                    </div>

                    {/* メッセージプレビュー */}
                    <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {b.message_content}
                      </p>
                    </div>

                    {/* 送信結果 */}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-gray-500">送信 {b.sent_count}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="text-gray-500">失敗 {b.failed_count}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        <span className="text-gray-500">UID無 {b.no_uid_count}</span>
                      </span>
                      <span className="ml-auto text-gray-400">
                        対象 {b.total_targets}人 ({rate}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
