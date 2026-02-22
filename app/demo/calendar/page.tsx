"use client";

import { useState, useMemo } from "react";
import { DEMO_RESERVATIONS, getMonthReservationCounts } from "../_data/mock";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const statusStyles: Record<string, string> = {
  "未診": "bg-pink-100 text-pink-700 border-pink-200",
  OK: "bg-emerald-100 text-emerald-700 border-emerald-200",
  NG: "bg-red-100 text-red-700 border-red-200",
  "キャンセル": "bg-slate-100 text-slate-500 border-slate-200",
};

export default function DemoCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = now.toISOString().slice(0, 10);

  const reservationCounts = useMemo(() => getMonthReservationCounts(year, month), [year, month]);

  // カレンダーのマス目を生成
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
    setSelectedDate(null);
  };

  const selectedReservations = selectedDate
    ? DEMO_RESERVATIONS.filter((r) => r.date === selectedDate)
    : [];

  return (
    <div className="p-6 pb-16 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">予約カレンダー</h1>
        <p className="text-sm text-slate-500 mt-1">月間の予約状況を確認</p>
      </div>

      {/* カレンダー */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        {/* 月の切替 */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-slate-800">
            {year}年 {month}月
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className={`text-center text-xs font-semibold py-2 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-500"}`}>
              {day}
            </div>
          ))}
        </div>

        {/* 日付マス */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const count = reservationCounts[dateStr] || 0;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayOfWeek = new Date(year, month - 1, day).getDay();

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`relative p-2 rounded-lg text-sm transition-all min-h-[60px] flex flex-col items-center ${
                  isSelected
                    ? "bg-blue-500 text-white ring-2 ring-blue-300"
                    : isToday
                    ? "bg-blue-50 border-2 border-blue-400 text-blue-700"
                    : "hover:bg-slate-50 text-slate-700"
                } ${dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : ""}`}
              >
                <span className={`font-medium ${isSelected ? "text-white" : ""}`}>{day}</span>
                {count > 0 && (
                  <span className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected ? "bg-white/30 text-white" : "bg-blue-100 text-blue-700"
                  }`}>
                    {count}件
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択日の予約一覧 */}
      {selectedDate && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            {selectedDate.replace(/-/g, "/")} の予約
          </h3>
          {selectedReservations.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">この日の予約データはありません</p>
          ) : (
            <div className="space-y-3">
              {selectedReservations.map((res) => (
                <div key={res.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-800">{res.time}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{res.patientName}</p>
                    <p className="text-xs text-slate-500">{res.menu}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[res.status]}`}>
                    {res.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
