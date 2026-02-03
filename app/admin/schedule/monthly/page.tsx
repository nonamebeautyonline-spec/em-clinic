"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

type Override = {
  doctor_id: string;
  date: string;
  type: "closed" | "open" | "modify";
  slot_name?: string | null;
  start_time?: string;
  end_time?: string;
  slot_minutes?: number;
  capacity?: number;
  memo?: string;
};

type WeeklyRule = {
  doctor_id: string;
  weekday: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  capacity: number;
};

type DayConfig = {
  date: string;
  isWeeklyOpen: boolean; // 週間ルールでは営業日か
  overrides: Override[]; // その日の例外設定
  effectiveStatus: "open" | "closed" | "modified"; // 実効ステータス
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const WEEKDAY_COLORS = [
  "text-red-500", // 日
  "text-slate-700", // 月
  "text-slate-700", // 火
  "text-slate-700", // 水
  "text-slate-700", // 木
  "text-slate-700", // 金
  "text-blue-500", // 土
];

// 時間帯プリセット
const TIME_PRESETS = [
  { name: "午前", start: "10:00", end: "13:00" },
  { name: "午後", start: "14:00", end: "18:00" },
  { name: "夜間", start: "18:00", end: "21:00" },
  { name: "終日", start: "10:00", end: "19:00" },
];

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // 前月の日を埋める（週の始まりを日曜に）
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i);
    days.push(d);
  }

  // 当月の日
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month - 1, d));
  }

  // 次月の日を埋める（6週分に）
  while (days.length < 42) {
    const lastDate = days[days.length - 1];
    days.push(new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 1));
  }

  return days;
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MonthlySchedulePage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 2); // 翌月
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weeklyRules, setWeeklyRules] = useState<WeeklyRule[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 編集用の一時状態
  const [editSlots, setEditSlots] = useState<Override[]>([]);

  // 週間ルール編集モード
  const [showWeeklyEditor, setShowWeeklyEditor] = useState(false);
  const [editingWeeklyRules, setEditingWeeklyRules] = useState<WeeklyRule[]>([]);

  const doctorId = "dr_default";
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const monthDisplay = `${year}年${month}月`;

  // 月の日数配列
  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  // 週間ルールのマップ
  const weeklyMap = useMemo(() => {
    const map = new Map<number, WeeklyRule>();
    weeklyRules.filter(r => r.doctor_id === doctorId).forEach(r => map.set(r.weekday, r));
    return map;
  }, [weeklyRules, doctorId]);

  // 日別の例外設定マップ
  const overrideMap = useMemo(() => {
    const map = new Map<string, Override[]>();
    overrides.filter(o => o.doctor_id === doctorId).forEach(o => {
      const key = o.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return map;
  }, [overrides, doctorId]);

  // 各日の設定情報
  const dayConfigs = useMemo(() => {
    const configs: DayConfig[] = [];
    for (const d of monthDays) {
      const dateStr = formatDateStr(d);
      const weekday = d.getDay();
      const rule = weeklyMap.get(weekday);
      const isWeeklyOpen = rule?.enabled ?? false;
      const dayOverrides = overrideMap.get(dateStr) || [];

      let effectiveStatus: "open" | "closed" | "modified" = isWeeklyOpen ? "open" : "closed";
      if (dayOverrides.length > 0) {
        const hasClosed = dayOverrides.some(o => o.type === "closed");
        const hasOpen = dayOverrides.some(o => o.type === "open");
        const hasModify = dayOverrides.some(o => o.type === "modify");

        if (hasClosed) effectiveStatus = "closed";
        else if (hasOpen || hasModify) effectiveStatus = isWeeklyOpen ? "modified" : "open";
      }

      configs.push({
        date: dateStr,
        isWeeklyOpen,
        overrides: dayOverrides,
        effectiveStatus,
      });
    }
    return configs;
  }, [monthDays, weeklyMap, overrideMap]);

  // データ読み込み
  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const res = await fetch(`/api/admin/schedule?start=${startDate}&end=${endDate}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.ok) {
          setWeeklyRules(json.weekly_rules || []);
          setOverrides(json.overrides || []);
        }

        // 月の開放状態を確認
        const adminToken = localStorage.getItem("adminToken");
        if (adminToken) {
          const openRes = await fetch(`/api/admin/booking-open?month=${monthStr}`, {
            cache: "no-store",
            headers: { "Authorization": `Bearer ${adminToken}` },
          });
          const openJson = await openRes.json();
          if (openJson.ok) {
            setIsMonthOpen(openJson.is_open);
          }
        }
      } catch (e) {
        console.error("Load error:", e);
        setMsg({ type: "error", text: "読み込みに失敗しました" });
      } finally {
        setLoading(false);
      }
    })();
  }, [year, month, monthStr]);

  // 日付選択時
  function onSelectDate(dateStr: string) {
    setSelectedDate(dateStr);
    const existing = overrideMap.get(dateStr) || [];
    if (existing.length > 0) {
      setEditSlots([...existing]);
    } else {
      // デフォルト: 週間ルールに基づく
      const d = new Date(dateStr);
      const rule = weeklyMap.get(d.getDay());
      if (rule?.enabled) {
        setEditSlots([{
          doctor_id: doctorId,
          date: dateStr,
          type: "modify",
          start_time: rule.start_time,
          end_time: rule.end_time,
          slot_minutes: rule.slot_minutes,
          capacity: rule.capacity,
        }]);
      } else {
        setEditSlots([]);
      }
    }
  }

  // 時間帯を追加
  function addSlot(preset?: typeof TIME_PRESETS[0]) {
    if (!selectedDate) return;
    const newSlot: Override = {
      doctor_id: doctorId,
      date: selectedDate,
      type: "open",
      slot_name: preset?.name || `時間帯${editSlots.length + 1}`,
      start_time: preset?.start || "10:00",
      end_time: preset?.end || "19:00",
      slot_minutes: 15,
      capacity: 2,
    };
    setEditSlots([...editSlots, newSlot]);
  }

  // スロット更新
  function updateSlot(index: number, patch: Partial<Override>) {
    setEditSlots(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  }

  // スロット削除
  function removeSlot(index: number) {
    setEditSlots(prev => prev.filter((_, i) => i !== index));
  }

  // 休診に設定
  function setDayClosed() {
    if (!selectedDate) return;
    setEditSlots([{
      doctor_id: doctorId,
      date: selectedDate,
      type: "closed",
    }]);
  }

  // 設定を保存
  async function saveDay() {
    if (!selectedDate) return;

    const adminToken = localStorage.getItem("adminToken");
    if (!adminToken) {
      setMsg({ type: "error", text: "管理者トークンが見つかりません" });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      // まず既存の設定を削除
      await fetch("/api/admin/date_override", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          doctor_id: doctorId,
          date: selectedDate,
          delete_all: true,
        }),
      });

      // 新しい設定を保存
      for (const slot of editSlots) {
        const res = await fetch("/api/admin/date_override", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ override: slot }),
        });
        const json = await res.json();
        if (!json.ok) {
          throw new Error(json.error || "保存に失敗しました");
        }
      }

      // ローカル状態を更新
      setOverrides(prev => {
        const filtered = prev.filter(o => o.date !== selectedDate);
        return [...filtered, ...editSlots];
      });

      setMsg({ type: "success", text: "設定を保存しました" });
      setSelectedDate(null);
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "保存に失敗しました" });
    } finally {
      setSaving(false);
    }
  }

  // 週間ルール編集を開始
  function openWeeklyEditor() {
    // 現在のルールをコピーして編集用に設定
    const rules: WeeklyRule[] = [];
    for (let wd = 0; wd < 7; wd++) {
      const existing = weeklyMap.get(wd);
      if (existing) {
        rules.push({ ...existing });
      } else {
        const isWeekday = wd >= 1 && wd <= 5;
        rules.push({
          doctor_id: doctorId,
          weekday: wd,
          enabled: isWeekday,
          start_time: isWeekday ? "10:00" : "",
          end_time: isWeekday ? "19:00" : "",
          slot_minutes: 15,
          capacity: 2,
        });
      }
    }
    setEditingWeeklyRules(rules);
    setShowWeeklyEditor(true);
    setSelectedDate(null);
  }

  // 週間ルールを更新
  function updateWeeklyRule(weekday: number, patch: Partial<WeeklyRule>) {
    setEditingWeeklyRules(prev =>
      prev.map(r => r.weekday === weekday ? { ...r, ...patch } : r)
    );
  }

  // 週間ルールを保存
  async function saveWeeklyRules() {
    const adminToken = localStorage.getItem("adminToken");
    if (!adminToken) {
      setMsg({ type: "error", text: "管理者トークンが見つかりません" });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/weekly_rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ doctor_id: doctorId, rules: editingWeeklyRules }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "保存に失敗しました");
      }

      // ローカル状態を更新
      setWeeklyRules(editingWeeklyRules);
      setMsg({ type: "success", text: "週間スケジュールを保存しました" });
      setShowWeeklyEditor(false);
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "保存に失敗しました" });
    } finally {
      setSaving(false);
    }
  }

  // 月を開放
  async function openMonth() {
    const adminToken = localStorage.getItem("adminToken");
    if (!adminToken) {
      setMsg({ type: "error", text: "管理者トークンが見つかりません" });
      return;
    }

    if (!confirm(`${monthDisplay}の予約を開放しますか？`)) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/booking-open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ month: monthStr }),
      });
      const json = await res.json();
      if (json.ok) {
        setIsMonthOpen(true);
        setMsg({ type: "success", text: `${monthDisplay}の予約を開放しました` });
      } else {
        throw new Error(json.error);
      }
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "開放に失敗しました" });
    } finally {
      setSaving(false);
    }
  }

  // 月を閉鎖
  async function closeMonth() {
    const adminToken = localStorage.getItem("adminToken");
    if (!adminToken) return;

    if (!confirm(`${monthDisplay}の予約を閉鎖しますか？（早期開放を取り消します）`)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/booking-open?month=${monthStr}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` },
      });
      const json = await res.json();
      if (json.ok) {
        setIsMonthOpen(false);
        setMsg({ type: "success", text: `${monthDisplay}の早期開放を取り消しました` });
      }
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "失敗しました" });
    } finally {
      setSaving(false);
    }
  }

  // 月の移動
  function prevMonth() {
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
  }

  const selectedDayConfig = selectedDate ? dayConfigs.find(c => c.date === selectedDate) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/admin/schedule" className="hover:text-slate-700 transition">
              予約枠管理
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">月別スケジュール</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">月別スケジュール設定</h1>
              <p className="text-slate-600 mt-1">
                カレンダーから日付を選択して予約枠を設定します
              </p>
            </div>
          </div>
        </div>

        {/* メッセージ */}
        {msg && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            <span>{msg.type === "success" ? "✓" : "!"}</span>
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* カレンダー */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* 月ナビゲーション */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-slate-200 rounded-lg transition"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-800">{monthDisplay}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isMonthOpen
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {isMonthOpen ? "予約開放中" : "予約未開放"}
                  </span>
                </div>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-slate-200 rounded-lg transition"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="mt-2 text-sm">読み込み中...</p>
                </div>
              ) : (
                <div className="p-4">
                  {/* 曜日ヘッダー */}
                  <div className="grid grid-cols-7 mb-2">
                    {WEEKDAYS.map((w, i) => (
                      <div key={w} className={`text-center text-sm font-medium py-2 ${WEEKDAY_COLORS[i]}`}>
                        {w}
                      </div>
                    ))}
                  </div>

                  {/* 日付グリッド */}
                  <div className="grid grid-cols-7 gap-1">
                    {dayConfigs.map((config, index) => {
                      const d = monthDays[index];
                      const isCurrentMonth = d.getMonth() + 1 === month;
                      const isSelected = config.date === selectedDate;
                      const isToday = formatDateStr(new Date()) === config.date;

                      return (
                        <button
                          key={config.date}
                          onClick={() => isCurrentMonth && onSelectDate(config.date)}
                          disabled={!isCurrentMonth}
                          className={`
                            aspect-square p-1 rounded-xl text-sm font-medium transition-all relative
                            ${!isCurrentMonth ? "text-slate-300 cursor-default" : "hover:ring-2 hover:ring-blue-300"}
                            ${isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""}
                            ${isToday ? "ring-2 ring-amber-400" : ""}
                          `}
                        >
                          <div className="h-full flex flex-col items-center justify-center">
                            <span className={`${WEEKDAY_COLORS[d.getDay()]} ${!isCurrentMonth ? "text-slate-300" : ""}`}>
                              {d.getDate()}
                            </span>
                            {isCurrentMonth && (
                              <div className="mt-1 flex gap-0.5">
                                {config.effectiveStatus === "open" && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                )}
                                {config.effectiveStatus === "closed" && (
                                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                )}
                                {config.effectiveStatus === "modified" && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                )}
                                {config.overrides.length > 1 && (
                                  <span className="text-[10px] text-slate-500">+{config.overrides.length - 1}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 凡例 */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>営業</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      <span>休診</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>変更あり</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 月の開放ボタン */}
            <div className="mt-4 flex gap-3">
              {!isMonthOpen ? (
                <button
                  onClick={openMonth}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 transition"
                >
                  {saving ? "処理中..." : `${monthDisplay}の予約を開放する`}
                </button>
              ) : (
                <button
                  onClick={closeMonth}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-300 disabled:opacity-50 transition"
                >
                  {saving ? "処理中..." : "早期開放を取り消す"}
                </button>
              )}
            </div>
          </div>

          {/* 設定パネル */}
          <div className="lg:col-span-1 space-y-4">
            {/* 週間ルール編集ボタン */}
            <button
              onClick={openWeeklyEditor}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-slate-800">週間スケジュール</div>
                <div className="text-xs text-slate-500">曜日ごとの基本設定を変更</div>
              </div>
            </button>

            {/* 週間ルール編集パネル */}
            {showWeeklyEditor && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-violet-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">週間スケジュール編集</h3>
                  <button
                    onClick={() => setShowWeeklyEditor(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                  {editingWeeklyRules.map((rule) => (
                    <div
                      key={rule.weekday}
                      className={`p-3 rounded-xl border ${
                        rule.enabled ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-medium ${WEEKDAY_COLORS[rule.weekday]}`}>
                          {WEEKDAYS[rule.weekday]}曜日
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(e) => updateWeeklyRule(rule.weekday, { enabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                        </label>
                      </div>
                      {rule.enabled && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <label className="text-[10px] text-slate-500">開始</label>
                            <input
                              type="time"
                              value={rule.start_time}
                              onChange={(e) => updateWeeklyRule(rule.weekday, { start_time: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">終了</label>
                            <input
                              type="time"
                              value={rule.end_time}
                              onChange={(e) => updateWeeklyRule(rule.weekday, { end_time: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => setShowWeeklyEditor(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={saveWeeklyRules}
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
                  >
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>
              </div>
            )}

            {/* 日別設定パネル */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800">
                  {selectedDate ? (
                    <>
                      {new Date(selectedDate).getMonth() + 1}/{new Date(selectedDate).getDate()}
                      （{WEEKDAYS[new Date(selectedDate).getDay()]}）の設定
                    </>
                  ) : (
                    "日別設定"
                  )}
                </h3>
              </div>

              {selectedDate ? (
                <div className="p-4 space-y-4">
                  {/* 基本情報 */}
                  <div className="text-sm text-slate-500">
                    週間ルール: {selectedDayConfig?.isWeeklyOpen ? "営業日" : "休診日"}
                  </div>

                  {/* クイック設定 */}
                  <div className="flex gap-2">
                    <button
                      onClick={setDayClosed}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition ${
                        editSlots.length === 1 && editSlots[0].type === "closed"
                          ? "bg-slate-700 text-white border-slate-700"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      休診
                    </button>
                    <button
                      onClick={() => addSlot(TIME_PRESETS[3])}
                      className="flex-1 px-3 py-2 text-sm font-medium rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      終日開放
                    </button>
                  </div>

                  {/* 時間帯プリセット */}
                  <div>
                    <div className="text-xs text-slate-500 mb-2">時間帯を追加:</div>
                    <div className="flex flex-wrap gap-2">
                      {TIME_PRESETS.slice(0, 3).map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => addSlot(preset)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                        >
                          {preset.name}
                        </button>
                      ))}
                      <button
                        onClick={() => addSlot()}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 transition"
                      >
                        + カスタム
                      </button>
                    </div>
                  </div>

                  {/* 設定済み時間帯 */}
                  {editSlots.length > 0 && editSlots[0].type !== "closed" && (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-500">設定済み時間帯:</div>
                      {editSlots.map((slot, index) => (
                        <div key={index} className="p-3 bg-slate-50 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={slot.slot_name || ""}
                              onChange={(e) => updateSlot(index, { slot_name: e.target.value })}
                              placeholder="時間帯名"
                              className="text-sm font-medium bg-transparent border-none p-0 focus:ring-0 text-slate-700 w-24"
                            />
                            <button
                              onClick={() => removeSlot(index)}
                              className="text-slate-400 hover:text-red-500 transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500">開始</label>
                              <input
                                type="time"
                                value={slot.start_time || ""}
                                onChange={(e) => updateSlot(index, { start_time: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500">終了</label>
                              <input
                                type="time"
                                value={slot.end_time || ""}
                                onChange={(e) => updateSlot(index, { end_time: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500">枠間隔</label>
                              <select
                                value={slot.slot_minutes || 15}
                                onChange={(e) => updateSlot(index, { slot_minutes: Number(e.target.value) })}
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg bg-white"
                              >
                                <option value={10}>10分</option>
                                <option value={15}>15分</option>
                                <option value={20}>20分</option>
                                <option value={30}>30分</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500">同時枠数</label>
                              <select
                                value={slot.capacity || 2}
                                onChange={(e) => updateSlot(index, { capacity: Number(e.target.value) })}
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg bg-white"
                              >
                                {[1, 2, 3, 4, 5].map(n => (
                                  <option key={n} value={n}>{n}名</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {editSlots.length === 1 && editSlots[0].type === "closed" && (
                    <div className="p-4 bg-slate-100 rounded-xl text-center">
                      <div className="text-slate-500 text-sm">この日は休診に設定されています</div>
                    </div>
                  )}

                  {/* 保存ボタン */}
                  <div className="pt-4 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={saveDay}
                      disabled={saving}
                      className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {saving ? "保存中..." : "保存"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">カレンダーから日付を<br />クリックして設定</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
