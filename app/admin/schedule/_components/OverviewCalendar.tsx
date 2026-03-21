"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";

type Doctor = {
  doctor_id: string;
  doctor_name: string;
  is_active: boolean;
  color?: string;
};

type WeeklyRule = {
  doctor_id: string;
  weekday: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
};

type Override = {
  doctor_id: string;
  date: string;
  type: "closed" | "open" | "modify";
  slot_name?: string | null;
  start_time?: string;
  end_time?: string;
  memo?: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const DEFAULT_COLOR = "#6366f1";

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, -i));
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month - 1, d));
  }
  while (days.length < 42) {
    const last = days[days.length - 1];
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  return days;
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OverviewCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [popover, setPopover] = useState<{ dateStr: string; x: number; y: number } | null>(null);

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: scheduleData } = useSWR<{
    ok: boolean;
    doctors: Doctor[];
    weekly_rules: WeeklyRule[];
    overrides: Override[];
  }>(`/api/admin/schedule?start=${startDate}&end=${endDate}`);

  const doctors = scheduleData?.ok ? scheduleData.doctors?.filter((d) => d.is_active) || [] : [];
  const weeklyRules = scheduleData?.ok ? scheduleData.weekly_rules || [] : [];
  const overrides = scheduleData?.ok ? scheduleData.overrides || [] : [];

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  // 医師ごとの曜日ルールマップ
  const weeklyMap = useMemo(() => {
    const map = new Map<string, Map<number, WeeklyRule>>();
    weeklyRules.forEach((r) => {
      if (!map.has(r.doctor_id)) map.set(r.doctor_id, new Map());
      map.get(r.doctor_id)!.set(r.weekday, r);
    });
    return map;
  }, [weeklyRules]);

  // 日別の例外設定マップ
  const overrideMap = useMemo(() => {
    const map = new Map<string, Override[]>();
    overrides.forEach((o) => {
      if (!map.has(o.date)) map.set(o.date, []);
      map.get(o.date)!.push(o);
    });
    return map;
  }, [overrides]);

  // 時間を短縮表示 (例: "10:00" → "10", "13:30" → "13:30")
  function shortTime(t: string): string {
    const [h, m] = t.slice(0, 5).split(":");
    return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`;
  }

  // 各日の時間帯行一覧（ドクター色付き、時間早い順ソート）
  type TimeSlotRow = { doctor: Doctor; time: string; sortKey: string };
  const dayDoctors = useMemo(() => {
    const result = new Map<string, TimeSlotRow[]>();
    for (const d of monthDays) {
      const dateStr = fmt(d);
      if (d.getMonth() + 1 !== month) continue;
      const weekday = d.getDay();
      const dayOverrides = overrideMap.get(dateStr) || [];
      const rows: TimeSlotRow[] = [];

      for (const doc of doctors) {
        const docOverrides = dayOverrides.filter((o) => o.doctor_id === doc.doctor_id);
        const weeklyRule = weeklyMap.get(doc.doctor_id)?.get(weekday);
        const isWeeklyOpen = weeklyRule?.enabled ?? false;

        if (docOverrides.length > 0) {
          const hasClosed = docOverrides.some((o) => o.type === "closed");
          if (!hasClosed) {
            docOverrides
              .filter((o) => o.start_time && o.end_time)
              .forEach((o) => {
                rows.push({
                  doctor: doc,
                  time: `${shortTime(o.start_time!)}-${shortTime(o.end_time!)}`,
                  sortKey: o.start_time!,
                });
              });
          }
        } else if (isWeeklyOpen && weeklyRule) {
          rows.push({
            doctor: doc,
            time: `${shortTime(weeklyRule.start_time)}-${shortTime(weeklyRule.end_time)}`,
            sortKey: weeklyRule.start_time,
          });
        }
      }
      // 時間早い順にソート
      rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      result.set(dateStr, rows);
    }
    return result;
  }, [monthDays, month, doctors, weeklyMap, overrideMap]);

  function navigate(dir: -1 | 1) {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setYear(newYear);
    setMonth(newMonth);
    setPopover(null);
  }

  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setPopover(null);
  }

  function handleCellClick(dateStr: string, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover(popover?.dateStr === dateStr ? null : { dateStr, x: rect.left, y: rect.bottom + 4 });
  }

  const todayStr = fmt(now);
  const popoverData = popover ? dayDoctors.get(popover.dateStr) || [] : [];

  return (
    <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-slate-800 min-w-[120px] text-center">
            {year}年{month}月
          </h2>
          <button onClick={() => navigate(1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={goToday} className="ml-2 px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
            今月
          </button>
        </div>
      </div>

      {/* カレンダーグリッド */}
      <div className="p-4">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={`text-center text-sm font-medium py-2 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"
            }`}>
              {w}
            </div>
          ))}
        </div>

        {/* 日付セル */}
        <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-lg overflow-hidden">
          {monthDays.map((d) => {
            const dateStr = fmt(d);
            const isCurrentMonth = d.getMonth() + 1 === month;
            const isToday = dateStr === todayStr;
            const docs = dayDoctors.get(dateStr) || [];
            const isAllClosed = isCurrentMonth && docs.length === 0;

            return (
              <button
                key={dateStr}
                onClick={(e) => isCurrentMonth && handleCellClick(dateStr, e)}
                className={`relative min-h-[88px] p-1.5 text-left transition ${
                  isCurrentMonth
                    ? isAllClosed
                      ? "bg-slate-50 hover:bg-slate-100"
                      : "bg-white hover:bg-blue-50"
                    : "bg-slate-50/50"
                } ${popover?.dateStr === dateStr ? "ring-2 ring-blue-400 z-10" : ""}`}
              >
                <div className={`text-sm font-semibold mb-0.5 ${
                  !isCurrentMonth ? "text-slate-300" :
                  isToday ? "w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs" :
                  d.getDay() === 0 ? "text-red-500" :
                  d.getDay() === 6 ? "text-blue-500" :
                  "text-slate-700"
                }`}>
                  {d.getDate()}
                </div>
                {isCurrentMonth && docs.length > 0 && (
                  <div className="space-y-0.5">
                    {docs.map((row, i) => (
                      <div
                        key={`${row.doctor.doctor_id}-${i}`}
                        title={`${row.doctor.doctor_name} ${row.time}`}
                        className="flex items-center gap-1 rounded px-1 py-0.5"
                        style={{ backgroundColor: `${row.doctor.color || DEFAULT_COLOR}15` }}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: row.doctor.color || DEFAULT_COLOR }}
                        />
                        <span className="text-[11px] leading-tight text-slate-700 truncate font-medium">
                          {row.time}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 凡例 */}
        {doctors.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-4 px-2">
            {doctors.map((doc) => (
              <div key={doc.doctor_id} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: doc.color || DEFAULT_COLOR }}
                />
                <span className="text-xs text-slate-600">{doc.doctor_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ポップオーバー */}
      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-4 min-w-[220px]"
            style={{ left: Math.min(popover.x, window.innerWidth - 240), top: popover.y }}
          >
            <div className="text-sm font-bold text-slate-800 mb-3">
              {popover.dateStr.replace(/(\d{4})-(\d{2})-(\d{2})/, "$1年$2月$3日")}
            </div>
            {popoverData.length === 0 ? (
              <p className="text-sm text-slate-400">休診日</p>
            ) : (
              <div className="space-y-2">
                {popoverData.map((row, i) => (
                  <div key={`${row.doctor.doctor_id}-${i}`} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: row.doctor.color || DEFAULT_COLOR }}
                    />
                    <span className="text-sm font-medium text-slate-700">{row.doctor.doctor_name}</span>
                    <span className="text-xs text-slate-400 ml-auto">{row.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
