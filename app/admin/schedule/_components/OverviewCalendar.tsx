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

  // 各日の担当医師一覧を計算
  const dayDoctors = useMemo(() => {
    const result = new Map<string, { doctor: Doctor; status: string; time?: string }[]>();
    for (const d of monthDays) {
      const dateStr = fmt(d);
      if (d.getMonth() + 1 !== month) continue;
      const weekday = d.getDay();
      const dayOverrides = overrideMap.get(dateStr) || [];
      const activeDoctors: { doctor: Doctor; status: string; time?: string }[] = [];

      for (const doc of doctors) {
        const docOverrides = dayOverrides.filter((o) => o.doctor_id === doc.doctor_id);
        const weeklyRule = weeklyMap.get(doc.doctor_id)?.get(weekday);
        const isWeeklyOpen = weeklyRule?.enabled ?? false;

        if (docOverrides.length > 0) {
          const hasClosed = docOverrides.some((o) => o.type === "closed");
          if (!hasClosed) {
            const firstOverride = docOverrides[0];
            const time = firstOverride.start_time && firstOverride.end_time
              ? `${firstOverride.start_time.slice(0, 5)}-${firstOverride.end_time.slice(0, 5)}`
              : undefined;
            activeDoctors.push({ doctor: doc, status: "modified", time });
          }
        } else if (isWeeklyOpen) {
          const time = weeklyRule
            ? `${weeklyRule.start_time.slice(0, 5)}-${weeklyRule.end_time.slice(0, 5)}`
            : undefined;
          activeDoctors.push({ doctor: doc, status: "open", time });
        }
      }
      result.set(dateStr, activeDoctors);
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
            <div key={w} className={`text-center text-xs font-medium py-2 ${
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
                className={`relative min-h-[72px] p-1.5 text-left transition ${
                  isCurrentMonth
                    ? isAllClosed
                      ? "bg-slate-50 hover:bg-slate-100"
                      : "bg-white hover:bg-blue-50"
                    : "bg-slate-50/50"
                } ${popover?.dateStr === dateStr ? "ring-2 ring-blue-400 z-10" : ""}`}
              >
                <div className={`text-xs font-medium mb-1 ${
                  !isCurrentMonth ? "text-slate-300" :
                  isToday ? "w-5 h-5 flex items-center justify-center rounded-full bg-blue-600 text-white" :
                  d.getDay() === 0 ? "text-red-500" :
                  d.getDay() === 6 ? "text-blue-500" :
                  "text-slate-700"
                }`}>
                  {d.getDate()}
                </div>
                {isCurrentMonth && (
                  <div className="flex flex-wrap gap-0.5">
                    {docs.map(({ doctor }) => (
                      <div
                        key={doctor.doctor_id}
                        title={doctor.doctor_name}
                        className="w-3 h-3 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: doctor.color || DEFAULT_COLOR }}
                      />
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
                {popoverData.map(({ doctor, time }) => (
                  <div key={doctor.doctor_id} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: doctor.color || DEFAULT_COLOR }}
                    />
                    <span className="text-sm font-medium text-slate-700">{doctor.doctor_name}</span>
                    {time && <span className="text-xs text-slate-400 ml-auto">{time}</span>}
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
