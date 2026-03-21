"use client";

import Link from "next/link";
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
  start_time?: string;
  end_time?: string;
};

// 時間差分を時間単位で計算
function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

// 時間を短縮表示
function shortTime(t: string): string {
  const [h, m] = t.slice(0, 5).split(":");
  return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`;
}

type DayDetail = {
  date: string;
  weekday: number;
  doctorId: string;
  originalHours: number;
  adjustedHours: number | null; // null = 未修正
  slots: { start: string; end: string; source: "weekly" | "override" }[];
};

export default function WorkHoursPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<Map<string, number>>(new Map()); // "doctorId:date" → adjustedHours

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${monthStr}-01`;
  const endDate = `${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const { data: scheduleData, isLoading } = useSWR<{
    ok: boolean;
    doctors: Doctor[];
    weekly_rules: WeeklyRule[];
    overrides: Override[];
  }>(`/api/admin/schedule?start=${startDate}&end=${endDate}`);

  const doctors = scheduleData?.ok ? (scheduleData.doctors || []).filter((d) => d.is_active) : [];
  const weeklyRules = scheduleData?.ok ? scheduleData.weekly_rules || [] : [];
  const overrides = scheduleData?.ok ? scheduleData.overrides || [] : [];

  // 医師ごとの日別詳細計算
  const doctorDetails = useMemo(() => {
    const result = new Map<string, DayDetail[]>();

    for (const doc of doctors) {
      const days: DayDetail[] = [];
      const docWeekly = weeklyRules.filter((r) => r.doctor_id === doc.doctor_id);
      const docOverrides = overrides.filter((o) => o.doctor_id === doc.doctor_id);

      const weeklyMap = new Map<number, WeeklyRule>();
      docWeekly.forEach((r) => weeklyMap.set(r.weekday, r));

      const overrideMap = new Map<string, Override[]>();
      docOverrides.forEach((o) => {
        if (!overrideMap.has(o.date)) overrideMap.set(o.date, []);
        overrideMap.get(o.date)!.push(o);
      });

      for (let d = 1; d <= lastDay; d++) {
        const dateObj = new Date(year, month - 1, d);
        const dateStr = `${monthStr}-${String(d).padStart(2, "0")}`;
        const weekday = dateObj.getDay();
        const dayOverrides = overrideMap.get(dateStr) || [];
        const weeklyRule = weeklyMap.get(weekday);

        let originalHours = 0;
        const slots: DayDetail["slots"] = [];

        if (dayOverrides.length > 0) {
          const hasClosed = dayOverrides.some((o) => o.type === "closed");
          if (!hasClosed) {
            dayOverrides
              .filter((o) => o.start_time && o.end_time && o.type !== "closed")
              .forEach((o) => {
                const h = calcHours(o.start_time!, o.end_time!);
                originalHours += h;
                slots.push({ start: o.start_time!.slice(0, 5), end: o.end_time!.slice(0, 5), source: "override" });
              });
          }
        } else if (weeklyRule?.enabled) {
          originalHours = calcHours(weeklyRule.start_time, weeklyRule.end_time);
          slots.push({ start: weeklyRule.start_time.slice(0, 5), end: weeklyRule.end_time.slice(0, 5), source: "weekly" });
        }

        const adjustKey = `${doc.doctor_id}:${dateStr}`;
        const adjustedHours = adjustments.has(adjustKey) ? adjustments.get(adjustKey)! : null;

        days.push({ date: dateStr, weekday, doctorId: doc.doctor_id, originalHours, adjustedHours, slots });
      }

      result.set(doc.doctor_id, days);
    }
    return result;
  }, [doctors, weeklyRules, overrides, year, month, lastDay, monthStr, adjustments]);

  // 医師ごとの月合計
  const doctorTotals = useMemo(() => {
    const totals = new Map<string, { original: number; adjusted: number; hasAdjustment: boolean }>();
    for (const doc of doctors) {
      const days = doctorDetails.get(doc.doctor_id) || [];
      let original = 0;
      let adjusted = 0;
      let hasAdjustment = false;
      for (const day of days) {
        original += day.originalHours;
        if (day.adjustedHours !== null) {
          adjusted += day.adjustedHours;
          hasAdjustment = true;
        } else {
          adjusted += day.originalHours;
        }
      }
      totals.set(doc.doctor_id, { original, adjusted, hasAdjustment });
    }
    return totals;
  }, [doctors, doctorDetails]);

  function adjustDay(doctorId: string, dateStr: string, hours: number) {
    setAdjustments((prev) => {
      const next = new Map(prev);
      next.set(`${doctorId}:${dateStr}`, hours);
      return next;
    });
  }

  function resetDay(doctorId: string, dateStr: string) {
    setAdjustments((prev) => {
      const next = new Map(prev);
      next.delete(`${doctorId}:${dateStr}`);
      return next;
    });
  }

  const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
    setExpandedDoctor(null);
  }

  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
    setExpandedDoctor(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/admin/schedule" className="hover:text-slate-700 transition">
              予約枠管理
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">業務時間管理</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">業務時間管理</h1>
          <p className="text-slate-600 mt-1">
            医師ごとの月間業務時間を確認・修正できます
          </p>
        </div>

        {/* 月ナビ */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg border border-slate-200 transition">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-slate-800 min-w-[120px] text-center">
            {year}年{month}月
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg border border-slate-200 transition">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-500">読み込み中...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            医師データがありません
          </div>
        ) : (
          <div className="space-y-4">
            {doctors.map((doc) => {
              const totals = doctorTotals.get(doc.doctor_id);
              const isExpanded = expandedDoctor === doc.doctor_id;
              const days = doctorDetails.get(doc.doctor_id) || [];

              return (
                <div key={doc.doctor_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* サマリー行 */}
                  <button
                    onClick={() => setExpandedDoctor(isExpanded ? null : doc.doctor_id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: doc.color || "#6366f1" }}
                      />
                      <span className="text-lg font-bold text-slate-800">{doc.doctor_name}</span>
                      <span className="text-sm text-slate-500 font-mono">{doc.doctor_id}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {totals?.hasAdjustment ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400 line-through">{totals.original.toFixed(1)}h</span>
                            <span className="text-lg font-bold text-amber-600">{totals.adjusted.toFixed(1)}h</span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-slate-800">{totals?.original.toFixed(1) || "0.0"}h</span>
                        )}
                        <div className="text-xs text-slate-500">月間合計</div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* 日別詳細 */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-slate-600 font-medium w-28">日付</th>
                              <th className="px-4 py-2 text-left text-slate-600 font-medium">時間帯</th>
                              <th className="px-4 py-2 text-center text-slate-600 font-medium w-24">元の時間</th>
                              <th className="px-4 py-2 text-center text-slate-600 font-medium w-32">修正後</th>
                              <th className="px-4 py-2 text-center text-slate-600 font-medium w-20">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {days.map((day) => {
                              const isAdjusted = day.adjustedHours !== null;
                              const weekdayColor = day.weekday === 0 ? "text-red-500" : day.weekday === 6 ? "text-blue-500" : "text-slate-700";

                              return (
                                <tr key={day.date} className={`border-t border-slate-50 ${day.originalHours === 0 && !isAdjusted ? "bg-slate-50/50" : ""}`}>
                                  <td className="px-4 py-2.5">
                                    <span className={`font-medium ${weekdayColor}`}>
                                      {Number(day.date.split("-")[2])}日
                                    </span>
                                    <span className={`ml-1 text-xs ${weekdayColor}`}>
                                      ({WEEKDAYS[day.weekday]})
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {day.slots.length === 0 ? (
                                      <span className="text-slate-400">-</span>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {day.slots.map((slot, si) => (
                                          <span
                                            key={si}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                              slot.source === "override"
                                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                : "bg-slate-100 text-slate-600"
                                            }`}
                                          >
                                            {shortTime(slot.start)}-{shortTime(slot.end)}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`font-mono ${isAdjusted ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                      {day.originalHours > 0 ? `${day.originalHours.toFixed(1)}h` : "-"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    {day.originalHours > 0 || isAdjusted ? (
                                      <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="24"
                                        value={isAdjusted ? day.adjustedHours! : day.originalHours}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          if (!isNaN(val) && val >= 0) {
                                            if (val === day.originalHours) {
                                              resetDay(doc.doctor_id, day.date);
                                            } else {
                                              adjustDay(doc.doctor_id, day.date, val);
                                            }
                                          }
                                        }}
                                        className={`w-20 px-2 py-1 border rounded-lg text-center text-sm font-mono ${
                                          isAdjusted
                                            ? "border-amber-300 bg-amber-50 text-amber-700 font-bold"
                                            : "border-slate-200 text-slate-600"
                                        }`}
                                      />
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    {isAdjusted && (
                                      <button
                                        onClick={() => resetDay(doc.doctor_id, day.date)}
                                        className="text-xs text-slate-500 hover:text-red-500 transition"
                                        title="修正を取り消す"
                                      >
                                        リセット
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-slate-50 border-t border-slate-200">
                            <tr>
                              <td className="px-4 py-3 font-bold text-slate-800" colSpan={2}>月間合計</td>
                              <td className="px-4 py-3 text-center font-mono">
                                <span className={totals?.hasAdjustment ? "text-slate-400 line-through" : "font-bold text-slate-800"}>
                                  {totals?.original.toFixed(1)}h
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono">
                                {totals?.hasAdjustment && (
                                  <span className="font-bold text-amber-600">{totals.adjusted.toFixed(1)}h</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {totals?.hasAdjustment && (
                                  <span className="text-xs text-slate-500">
                                    差: {(totals.adjusted - totals.original) >= 0 ? "+" : ""}{(totals.adjusted - totals.original).toFixed(1)}h
                                  </span>
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 説明 */}
        <div className="mt-6 text-xs text-slate-500 space-y-1">
          <p>・スケジュール設定（週間ルール・日別設定）から自動計算された業務時間を表示しています</p>
          <p>・修正後の列で時間を変更すると、変更前の値が取り消し線で表示されます</p>
          <p>・修正はこの画面上のみで保持されます（ページ再読み込みでリセット）</p>
        </div>
      </div>
    </div>
  );
}
