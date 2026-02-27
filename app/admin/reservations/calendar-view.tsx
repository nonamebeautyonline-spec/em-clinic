"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// === 型定義 ===
interface CalendarEvent {
  id: string;
  reserve_id: string;
  patient_id: string;
  patient_name: string;
  patient_tel: string;
  doctor_id: string;
  doctor_name: string;
  reserved_date: string; // YYYY-MM-DD
  reserved_time: string; // HH:MM
  status: string;
  prescription_menu: string;
}

type CalendarMode = "month" | "week" | "day";

// ステータス別の色定義
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  pending: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", label: "待機中" },
  confirmed: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300", label: "確定" },
  completed: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300", label: "完了" },
  OK: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300", label: "OK" },
  NG: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", label: "NG" },
  canceled: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", label: "キャンセル" },
  cancelled: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", label: "キャンセル" },
};

const DEFAULT_STATUS_COLOR = { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", label: "不明" };

// 時間軸の範囲（9:00〜20:00）
const HOUR_START = 9;
const HOUR_END = 20;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

// 曜日ラベル
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// === ユーティリティ関数 ===

/** YYYY-MM-DD形式の文字列を返す */
function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 日付文字列からDateオブジェクトを生成（タイムゾーン問題回避） */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 月の初日を取得 */
function getMonthStart(year: number, month: number): Date {
  return new Date(year, month, 1);
}

/** 月の最終日を取得 */
function getMonthEnd(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

/** 週の月曜日を取得 */
function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 日曜日の場合は前の月曜日
  d.setDate(d.getDate() + diff);
  return d;
}

/** 日付を加算 */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** 時間文字列を分に変換 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** 今日かどうかを判定 */
function isToday(dateStr: string): boolean {
  return dateStr === toDateStr(new Date());
}

// === メインコンポーネント ===
export default function CalendarView() {
  const [mode, setMode] = useState<CalendarMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [popover, setPopover] = useState<{ event: CalendarEvent; x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // ポップオーバー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    };
    if (popover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popover]);

  // 表示期間を計算
  const getDateRange = useCallback((): { start: string; end: string } => {
    if (mode === "month") {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      // カレンダー表示用に前後の週も含める
      const monthStart = getMonthStart(year, month);
      const monthEnd = getMonthEnd(year, month);
      const calStart = getWeekMonday(monthStart);
      const calEnd = addDays(getWeekMonday(addDays(monthEnd, 7)), -1);
      return { start: toDateStr(calStart), end: toDateStr(calEnd) };
    } else if (mode === "week") {
      const monday = getWeekMonday(currentDate);
      const sunday = addDays(monday, 6);
      return { start: toDateStr(monday), end: toDateStr(sunday) };
    } else {
      // 日ビュー
      const dateStr = toDateStr(currentDate);
      return { start: dateStr, end: dateStr };
    }
  }, [mode, currentDate]);

  // データ取得
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { start, end } = getDateRange();
      const res = await fetch(
        `/api/admin/reservations/calendar?start=${start}&end=${end}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `取得失敗 (${res.status})`);
      }
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error("Calendar fetch error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ナビゲーション
  const navigate = (direction: -1 | 1) => {
    const d = new Date(currentDate);
    if (mode === "month") {
      d.setMonth(d.getMonth() + direction);
    } else if (mode === "week") {
      d.setDate(d.getDate() + 7 * direction);
    } else {
      d.setDate(d.getDate() + direction);
    }
    setCurrentDate(d);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 月ビューから日ビューへ遷移
  const goToDay = (dateStr: string) => {
    setCurrentDate(parseDate(dateStr));
    setMode("day");
  };

  // ヘッダーのタイトル表示
  const getTitle = (): string => {
    if (mode === "month") {
      return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;
    } else if (mode === "week") {
      const monday = getWeekMonday(currentDate);
      const sunday = addDays(monday, 6);
      const ms = monday.getMonth() + 1;
      const md = monday.getDate();
      const ss = sunday.getMonth() + 1;
      const sd = sunday.getDate();
      return `${currentDate.getFullYear()}年 ${ms}/${md} - ${ss}/${sd}`;
    } else {
      const m = currentDate.getMonth() + 1;
      const d = currentDate.getDate();
      const dow = WEEKDAY_LABELS[currentDate.getDay()];
      return `${currentDate.getFullYear()}年${m}月${d}日 (${dow})`;
    }
  };

  // ポップオーバー表示
  const showPopover = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // 画面右端に近い場合は左側に表示
    const x = rect.right + 280 > window.innerWidth ? rect.left - 280 : rect.right + 4;
    const y = Math.min(rect.top, window.innerHeight - 220);
    setPopover({ event, x, y });
  };

  // ステータス色取得
  const getStatusColor = (status: string) => STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;

  return (
    <div className="space-y-4">
      {/* ヘッダー: ナビゲーション + ビュー切替 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            &lt;
          </button>
          <h2 className="text-lg font-semibold text-slate-900 min-w-[200px] text-center">
            {getTitle()}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            &gt;
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800 ml-2"
          >
            今日
          </button>
        </div>

        <div className="flex bg-slate-100 rounded-lg p-1">
          {(["month", "week", "day"] as CalendarMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                mode === m
                  ? "bg-white text-slate-900 shadow-sm font-medium"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {m === "month" ? "月" : m === "week" ? "週" : "日"}
            </button>
          ))}
        </div>
      </div>

      {/* ステータス凡例 */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_COLORS).filter(([key]) => !["cancelled", "OK", "NG"].includes(key)).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${color.bg} border ${color.border}`} />
            <span className="text-slate-600">{color.label}</span>
          </div>
        ))}
      </div>

      {/* エラー */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {/* カレンダー本体 */}
      {!loading && (
        <>
          {mode === "month" && (
            <MonthView
              currentDate={currentDate}
              events={events}
              onDayClick={goToDay}
              getStatusColor={getStatusColor}
            />
          )}
          {mode === "week" && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onEventClick={showPopover}
              getStatusColor={getStatusColor}
            />
          )}
          {mode === "day" && (
            <DayView
              currentDate={currentDate}
              events={events}
              onEventClick={showPopover}
              getStatusColor={getStatusColor}
            />
          )}
        </>
      )}

      {/* 予約詳細ポップオーバー */}
      {popover && (
        <div
          ref={popoverRef}
          className="fixed z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-[280px]"
          style={{ left: popover.x, top: popover.y }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 text-sm">予約詳細</h3>
            <button
              onClick={() => setPopover(null)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              x
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">患者名</span>
              <span className="font-medium text-slate-900">{popover.event.patient_name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">日時</span>
              <span className="font-mono text-slate-900">
                {popover.event.reserved_date} {popover.event.reserved_time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">医師</span>
              <span className="text-slate-900">{popover.event.doctor_name || "-"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">ステータス</span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  getStatusColor(popover.event.status).bg
                } ${getStatusColor(popover.event.status).text}`}
              >
                {getStatusColor(popover.event.status).label}
              </span>
            </div>
            {popover.event.patient_tel && (
              <div className="flex justify-between">
                <span className="text-slate-500">電話番号</span>
                <span className="font-mono text-slate-900">{popover.event.patient_tel}</span>
              </div>
            )}
            {popover.event.prescription_menu && (
              <div className="flex justify-between">
                <span className="text-slate-500">処方</span>
                <span className="text-slate-900">{popover.event.prescription_menu}</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t">
            <a
              href={`/admin/patients/${popover.event.patient_id}`}
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
            >
              患者詳細を開く
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// === 月ビュー ===
function MonthView({
  currentDate,
  events,
  onDayClick,
  getStatusColor,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (dateStr: string) => void;
  getStatusColor: (status: string) => { bg: string; text: string; border: string; label: string };
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStart = getMonthStart(year, month);
  const monthEnd = getMonthEnd(year, month);
  const calStart = getWeekMonday(monthStart);

  // 6週間分のグリッドを生成
  const weeks: string[][] = [];
  let day = new Date(calStart);
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(toDateStr(day));
      day = addDays(day, 1);
    }
    weeks.push(week);
    // 月末を超えたら終了
    if (parseDate(week[6]) > monthEnd && w >= 4) break;
  }

  // 日付ごとの予約数を集計
  const countByDate = new Map<string, Map<string, number>>();
  for (const ev of events) {
    if (!countByDate.has(ev.reserved_date)) {
      countByDate.set(ev.reserved_date, new Map());
    }
    const statusMap = countByDate.get(ev.reserved_date)!;
    statusMap.set(ev.status, (statusMap.get(ev.status) || 0) + 1);
  }

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {["月", "火", "水", "木", "金", "土", "日"].map((label, i) => (
          <div
            key={label}
            className={`py-2 text-center text-xs font-medium ${
              i === 5 ? "text-blue-600" : i === 6 ? "text-red-500" : "text-slate-600"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 日付セル */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
          {week.map((dateStr) => {
            const dateObj = parseDate(dateStr);
            const isCurrentMonth = dateObj.getMonth() === month;
            const today = isToday(dateStr);
            const statusMap = countByDate.get(dateStr);
            const totalCount = statusMap
              ? Array.from(statusMap.values()).reduce((a, b) => a + b, 0)
              : 0;
            const dayOfWeek = dateObj.getDay();

            return (
              <div
                key={dateStr}
                onClick={() => onDayClick(dateStr)}
                className={`min-h-[80px] p-1.5 cursor-pointer border-r border-slate-100 last:border-r-0 transition-colors hover:bg-slate-50 ${
                  !isCurrentMonth ? "bg-slate-50/50" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm leading-none ${
                      today
                        ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-semibold"
                        : !isCurrentMonth
                        ? "text-slate-300"
                        : dayOfWeek === 0
                        ? "text-red-500"
                        : dayOfWeek === 6
                        ? "text-blue-600"
                        : "text-slate-700"
                    }`}
                  >
                    {dateObj.getDate()}
                  </span>
                  {totalCount > 0 && (
                    <span className="text-[10px] font-semibold bg-blue-600 text-white rounded-full px-1.5 py-0.5 leading-none">
                      {totalCount}
                    </span>
                  )}
                </div>

                {/* ステータス別バッジ（上位3つまで表示） */}
                {statusMap && (
                  <div className="space-y-0.5">
                    {Array.from(statusMap.entries())
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([status, count]) => {
                        const color = getStatusColor(status);
                        return (
                          <div
                            key={status}
                            className={`text-[10px] px-1 py-0.5 rounded ${color.bg} ${color.text} truncate`}
                          >
                            {color.label} {count}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// === 週ビュー ===
function WeekView({
  currentDate,
  events,
  onEventClick,
  getStatusColor,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
  getStatusColor: (status: string) => { bg: string; text: string; border: string; label: string };
}) {
  const monday = getWeekMonday(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    return toDateStr(d);
  });

  // 日付ごとにイベントをグループ化
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    if (!eventsByDate.has(ev.reserved_date)) {
      eventsByDate.set(ev.reserved_date, []);
    }
    eventsByDate.get(ev.reserved_date)!.push(ev);
  }

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 overflow-auto">
      <div className="min-w-[700px]">
        {/* ヘッダー（曜日 + 日付） */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="py-2 border-r border-slate-200" />
          {days.map((dateStr, i) => {
            const dateObj = parseDate(dateStr);
            const today = isToday(dateStr);
            return (
              <div
                key={dateStr}
                className={`py-2 text-center border-r border-slate-100 last:border-r-0 ${
                  today ? "bg-blue-50" : ""
                }`}
              >
                <div className={`text-xs ${i === 5 ? "text-blue-600" : i === 6 ? "text-red-500" : "text-slate-500"}`}>
                  {WEEKDAY_LABELS[(i + 1) % 7 === 0 ? 0 : (i + 1) % 7]}
                </div>
                <div
                  className={`text-sm font-semibold mt-0.5 ${
                    today
                      ? "bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto"
                      : "text-slate-700"
                  }`}
                >
                  {dateObj.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* 時間軸 + イベント */}
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0">
            {/* 時間ラベル */}
            <div className="py-2 px-2 text-xs text-slate-400 text-right border-r border-slate-200 min-h-[48px]">
              {String(hour).padStart(2, "0")}:00
            </div>

            {/* 各日のスロット */}
            {days.map((dateStr) => {
              const dayEvents = (eventsByDate.get(dateStr) || []).filter((ev) => {
                const minutes = timeToMinutes(ev.reserved_time);
                return minutes >= hour * 60 && minutes < (hour + 1) * 60;
              });
              const today = isToday(dateStr);

              return (
                <div
                  key={dateStr}
                  className={`border-r border-slate-100 last:border-r-0 min-h-[48px] p-0.5 ${
                    today ? "bg-blue-50/30" : ""
                  }`}
                >
                  {dayEvents.map((ev) => {
                    const color = getStatusColor(ev.status);
                    return (
                      <button
                        key={ev.id}
                        onClick={(e) => onEventClick(ev, e)}
                        className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded border mb-0.5 truncate ${color.bg} ${color.text} ${color.border} hover:opacity-80 transition-opacity`}
                      >
                        <span className="font-mono">{ev.reserved_time}</span>{" "}
                        <span className="font-medium">{ev.patient_name || "名前なし"}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// === 日ビュー ===
function DayView({
  currentDate,
  events,
  onEventClick,
  getStatusColor,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
  getStatusColor: (status: string) => { bg: string; text: string; border: string; label: string };
}) {
  const dateStr = toDateStr(currentDate);
  const dayEvents = events.filter((ev) => ev.reserved_date === dateStr);

  // 医師ごとにグループ化
  const doctorIds = [...new Set(dayEvents.map((ev) => ev.doctor_id || "_none"))];
  const doctorNames = new Map<string, string>();
  for (const ev of dayEvents) {
    const key = ev.doctor_id || "_none";
    if (!doctorNames.has(key)) {
      doctorNames.set(key, ev.doctor_name || "未割当");
    }
  }

  // 医師がいない場合でもカラムを1つは表示
  const columns = doctorIds.length > 0 ? doctorIds : ["_none"];
  if (!doctorNames.has("_none")) {
    doctorNames.set("_none", "未割当");
  }

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 overflow-auto">
      <div style={{ minWidth: Math.max(400, columns.length * 200 + 60) }}>
        {/* 医師名ヘッダー */}
        <div
          className="border-b border-slate-200 sticky top-0 bg-white z-10"
          style={{
            display: "grid",
            gridTemplateColumns: `60px repeat(${columns.length}, 1fr)`,
          }}
        >
          <div className="py-3 border-r border-slate-200" />
          {columns.map((docId) => (
            <div
              key={docId}
              className="py-3 text-center border-r border-slate-100 last:border-r-0"
            >
              <div className="text-sm font-semibold text-slate-700">
                {doctorNames.get(docId) || "未割当"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {dayEvents.filter((ev) => (ev.doctor_id || "_none") === docId).length}件
              </div>
            </div>
          ))}
        </div>

        {/* 時間軸 + 医師カラム */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="border-b border-slate-100 last:border-b-0"
            style={{
              display: "grid",
              gridTemplateColumns: `60px repeat(${columns.length}, 1fr)`,
            }}
          >
            {/* 時間ラベル */}
            <div className="py-2 px-2 text-xs text-slate-400 text-right border-r border-slate-200 min-h-[56px]">
              {String(hour).padStart(2, "0")}:00
            </div>

            {/* 医師ごとのスロット */}
            {columns.map((docId) => {
              const slotEvents = dayEvents.filter((ev) => {
                const minutes = timeToMinutes(ev.reserved_time);
                return (
                  (ev.doctor_id || "_none") === docId &&
                  minutes >= hour * 60 &&
                  minutes < (hour + 1) * 60
                );
              });

              return (
                <div
                  key={docId}
                  className="border-r border-slate-100 last:border-r-0 min-h-[56px] p-1"
                >
                  {slotEvents.map((ev) => {
                    const color = getStatusColor(ev.status);
                    return (
                      <button
                        key={ev.id}
                        onClick={(e) => onEventClick(ev, e)}
                        className={`w-full text-left text-xs leading-tight p-1.5 rounded border mb-1 ${color.bg} ${color.text} ${color.border} hover:opacity-80 transition-opacity`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-semibold">{ev.reserved_time}</span>
                          <span
                            className={`text-[10px] px-1 rounded ${color.bg} ${color.text}`}
                          >
                            {color.label}
                          </span>
                        </div>
                        <div className="font-medium mt-0.5 truncate">
                          {ev.patient_name || "名前なし"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
