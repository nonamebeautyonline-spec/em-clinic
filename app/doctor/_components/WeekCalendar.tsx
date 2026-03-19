"use client";

import { type StatusFilter, formatWeekLabel } from "./types";

type WeekCalendarProps = {
  weekDates: string[];
  selectedDate: string;
  weekOffset: number;
  today: Date;
  statusFilter: StatusFilter;
  stats: { pending: number; ok: number; ng: number };
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
  setStatusFilter: (f: StatusFilter) => void;
  handleDateSelect: (date: string) => void;
};

export function WeekCalendar({
  weekDates,
  selectedDate,
  weekOffset,
  today,
  statusFilter,
  stats,
  setWeekOffset,
  setStatusFilter,
  handleDateSelect,
}: WeekCalendarProps) {
  return (
    <>
      {/* 1週間分の日付タブ + 週送り */}
      <div className="flex items-center gap-2 mb-1 text-xs">
        {/* 前の1週間 */}
        <button
          type="button"
          onClick={() => {
            setWeekOffset((prev) => {
              const next = prev - 1;
              const start = new Date(today);
              start.setDate(today.getDate() + next * 7);
              const newDate = start.toISOString().slice(0, 10);
              handleDateSelect(newDate);
              return next;
            });
          }}
          className="px-2 py-1 rounded-full border bg-white text-slate-600 border-slate-300"
        >
          ◀
        </button>

        {/* 日付タブ本体 */}
        <div className="flex gap-2 overflow-x-auto">
          {weekDates.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDateSelect(d)}
              className={`
                px-3 py-1.5 rounded-full border whitespace-nowrap
                ${
                  selectedDate === d
                    ? "bg-pink-500 text-white border-pink-500"
                    : "bg-white text-slate-700 border-slate-300"
                }
              `}
            >
              {formatWeekLabel(d)}
            </button>
          ))}
        </div>

        {/* 次の1週間 */}
        <button
          type="button"
          onClick={() => {
            setWeekOffset((prev) => {
              const next = prev + 1;
              const start = new Date(today);
              start.setDate(today.getDate() + next * 7);
              const newDate = start.toISOString().slice(0, 10);
              handleDateSelect(newDate);
              return next;
            });
          }}
          className="px-2 py-1 rounded-full border bg-white text-slate-600 border-slate-300"
        >
          ▶
        </button>
      </div>

      {/* ステータスフィルタ＆サマリー */}
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex gap-1">
          {(
            [
              {
                id: "pending" as StatusFilter,
                label: "未診",
                badge: stats.pending,
              },
              {
                id: "all" as StatusFilter,
                label: "すべて",
                badge: stats.pending + stats.ok + stats.ng,
              },
              { id: "ok" as StatusFilter, label: "OK", badge: stats.ok },
              { id: "ng" as StatusFilter, label: "NG", badge: stats.ng },
            ] as const
          ).map((f) => {
            const active = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`
                  px-2.5 py-1 rounded-full border flex items-center gap-1
                  ${
                    active
                      ? "bg-pink-500 border-pink-500 text-white"
                      : "bg-white border-slate-300 text-slate-600"
                  }
                `}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    active ? "bg-white/20" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {f.badge}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400">
          未診 {stats.pending} 件 / OK {stats.ok} 件 / NG {stats.ng} 件
        </p>
      </div>
    </>
  );
}
