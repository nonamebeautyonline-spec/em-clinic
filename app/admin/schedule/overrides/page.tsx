"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Doctor = {
  doctor_id: string;
  doctor_name: string;
  is_active: boolean;
};

type Override = {
  doctor_id: string;
  date: string;
  type: "closed" | "open" | "modify";
  slot_name?: string | null;
  start_time?: string;
  end_time?: string;
  slot_minutes?: number | "";
  capacity?: number | "";
  memo?: string;
};

// プリセット時間帯
const TIME_PRESETS = [
  { name: "午前", start: "10:00", end: "12:00", color: "bg-sky-500" },
  { name: "午後", start: "14:00", end: "17:00", color: "bg-amber-500" },
  { name: "夜間", start: "18:00", end: "21:00", color: "bg-indigo-500" },
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateJa(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

function firstDayOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function lastDayOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toGridDates(month: Date) {
  const start = firstDayOfMonth(month);
  const end = lastDayOfMonth(month);
  const gridStart = addDays(start, -start.getDay());
  const gridEnd = addDays(end, 6 - end.getDay());
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(new Date(d));
  return { gridStart, gridEnd, days };
}

function createEmptySlot(doctorId: string, date: string, slotName?: string): Override {
  return {
    doctor_id: doctorId,
    date,
    type: "open",
    slot_name: slotName || null,
    start_time: "",
    end_time: "",
    capacity: 2,
    slot_minutes: "",
    memo: "",
  };
}

export default function OverridesPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [month, setMonth] = useState(() => new Date());
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [drafts, setDrafts] = useState<Override[]>([]);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const activeDoctors = useMemo(() => doctors.filter((d) => d.is_active), [doctors]);
  const { gridStart, gridEnd, days } = useMemo(() => toGridDates(month), [month]);
  const rangeStart = useMemo(() => yyyyMmDd(gridStart), [gridStart]);
  const rangeEnd = useMemo(() => yyyyMmDd(gridEnd), [gridEnd]);

  const overridesByDate = useMemo(() => {
    const m = new Map<string, Override[]>();
    overrides.forEach((o) => {
      const arr = m.get(o.date) || [];
      arr.push(o);
      m.set(o.date, arr);
    });
    return m;
  }, [overrides]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/schedule?start=${rangeStart}&end=${rangeEnd}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.ok) {
        setDoctors(json.doctors || []);
        const first = (json.doctors || []).find((d: Doctor) => d.is_active)?.doctor_id || "";
        setDoctorId((prev) => prev || first);
      }
    })();
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    if (!doctorId) return;
    (async () => {
      setMsg(null);
      const res = await fetch(
        `/api/admin/schedule?doctor_id=${doctorId}&start=${rangeStart}&end=${rangeEnd}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (json?.ok) {
        setOverrides((json.overrides || []).filter((o: Override) => o.doctor_id === doctorId));
      }
    })();
  }, [doctorId, rangeStart, rangeEnd]);

  useEffect(() => {
    if (!doctorId) return;
    const today = yyyyMmDd(new Date());
    setSelectedDate((prev) => prev || today);
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId || !selectedDate) return;
    const existing = overridesByDate.get(selectedDate) || [];
    if (existing.length > 0) {
      setDrafts(existing.map((o) => ({ ...o })));
    } else {
      setDrafts([]);
    }
  }, [doctorId, selectedDate, overridesByDate]);

  function monthLabel(d: Date) {
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  }

  function getBadgeStyle(overridesOnDate: Override[]) {
    if (!overridesOnDate || overridesOnDate.length === 0) return null;
    const hasClosed = overridesOnDate.some((o) => o.type === "closed");
    const count = overridesOnDate.length;

    if (hasClosed && count === 1) {
      return { bg: "bg-slate-700", text: "休診" };
    }
    if (count > 1) {
      return { bg: "bg-violet-500", text: `${count}枠` };
    }
    const first = overridesOnDate[0];
    if (first.slot_name) {
      const preset = TIME_PRESETS.find((p) => p.name === first.slot_name);
      if (preset) return { bg: preset.color, text: first.slot_name };
    }
    return { bg: "bg-emerald-500", text: "設定有" };
  }

  function addSlot(preset?: { name: string; start: string; end: string }) {
    const newSlot = createEmptySlot(doctorId, selectedDate, preset?.name || `枠${drafts.length + 1}`);
    if (preset) {
      newSlot.start_time = preset.start;
      newSlot.end_time = preset.end;
      newSlot.type = "open";
    }
    setDrafts([...drafts, newSlot]);
  }

  function removeSlot(index: number) {
    setDrafts(drafts.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, updates: Partial<Override>) {
    setDrafts(drafts.map((d, i) => (i === index ? { ...d, ...updates } : d)));
  }

  async function saveAll() {
    setSaving(true);
    setMsg(null);

    try {
      if (drafts.length > 0) {
        for (const draft of drafts) {
          if (draft.type !== "closed") {
            if ((draft.start_time && !draft.end_time) || (!draft.start_time && draft.end_time)) {
              throw new Error(`${draft.slot_name || "スロット"}: 開始・終了時間の両方を入力してください`);
            }
          }
        }
      }

      await fetch("/api/admin/date_override", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId, date: selectedDate, delete_all: true }),
      });

      for (const draft of drafts) {
        const res = await fetch("/api/admin/date_override", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ override: draft }),
        });
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || "保存に失敗しました");
      }

      setMsg({ type: "success", text: drafts.length > 0 ? `${drafts.length}件の設定を保存しました` : "設定をクリアしました" });

      const r = await fetch(
        `/api/admin/schedule?doctor_id=${doctorId}&start=${rangeStart}&end=${rangeEnd}`,
        { cache: "no-store" }
      );
      const j = await r.json();
      setOverrides((j.overrides || []).filter((o: Override) => o.doctor_id === doctorId));
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  function setAllDayClosed() {
    setDrafts([
      {
        doctor_id: doctorId,
        date: selectedDate,
        type: "closed",
        slot_name: null,
        start_time: "",
        end_time: "",
        capacity: "",
        slot_minutes: "",
        memo: "終日休診",
      },
    ]);
  }

  const isToday = (d: Date) => yyyyMmDd(d) === yyyyMmDd(new Date());
  const isPast = (d: Date) => d < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/admin/schedule" className="hover:text-slate-700 transition">
              予約枠管理
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">日別スケジュール設定</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">日別スケジュール設定</h1>
              <p className="text-slate-600 mt-1">
                カレンダーから日付を選択して、予約枠を設定できます
              </p>
            </div>
            <select
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              {activeDoctors.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  {d.doctor_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* メッセージ */}
        {msg && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
              msg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <span>{msg.type === "success" ? "✓" : "!"}</span>
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* カレンダー */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* 月ナビ */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <button
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-lg font-bold text-slate-800">{monthLabel(month)}</h2>
                <button
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 border-b border-slate-100">
                {WEEKDAYS.map((w, i) => (
                  <div
                    key={w}
                    className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${
                      i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-500"
                    }`}
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* カレンダーグリッド */}
              <div className="grid grid-cols-7">
                {days.map((d) => {
                  const date = yyyyMmDd(d);
                  const inMonth = d.getMonth() === month.getMonth();
                  const isSelected = date === selectedDate;
                  const isTodayDate = isToday(d);
                  const isPastDate = isPast(d);
                  const overridesOnDate = overridesByDate.get(date) || [];
                  const badge = getBadgeStyle(overridesOnDate);

                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      disabled={!inMonth}
                      className={`
                        relative h-24 p-2 border-b border-r border-slate-100 text-left transition-all
                        ${inMonth ? "hover:bg-blue-50/50" : "bg-slate-50/50 cursor-default"}
                        ${isSelected ? "bg-blue-50 ring-2 ring-blue-500 ring-inset z-10" : ""}
                        ${isTodayDate && inMonth ? "bg-amber-50/50" : ""}
                        ${isPastDate && inMonth ? "opacity-60" : ""}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`
                            inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold
                            ${isTodayDate ? "bg-blue-600 text-white" : ""}
                            ${!isTodayDate && d.getDay() === 0 ? "text-red-500" : ""}
                            ${!isTodayDate && d.getDay() === 6 ? "text-blue-500" : ""}
                            ${!isTodayDate && d.getDay() !== 0 && d.getDay() !== 6 ? "text-slate-700" : ""}
                            ${!inMonth ? "text-slate-300" : ""}
                          `}
                        >
                          {d.getDate()}
                        </span>
                        {badge && inMonth && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${badge.bg}`}>
                            {badge.text}
                          </span>
                        )}
                      </div>
                      {overridesOnDate.length > 0 && inMonth && (
                        <div className="mt-1 space-y-0.5">
                          {overridesOnDate.slice(0, 2).map((o, i) => (
                            <div key={i} className="text-[10px] text-slate-500 truncate">
                              {o.start_time && o.end_time ? `${o.start_time}-${o.end_time}` : o.type === "closed" ? "休診" : o.memo || "設定あり"}
                            </div>
                          ))}
                          {overridesOnDate.length > 2 && (
                            <div className="text-[10px] text-slate-400">+{overridesOnDate.length - 2}件</div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 編集パネル */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 sticky top-6">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                <div className="text-lg font-bold text-slate-800">
                  {selectedDate ? formatDateJa(selectedDate) : "日付を選択"}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">予約枠を設定</p>
              </div>

              {selectedDate ? (
                <div className="p-4 space-y-4">
                  {/* クイック設定 */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">クイック設定</label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        onClick={setAllDayClosed}
                        className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                      >
                        終日休診
                      </button>
                      <button
                        onClick={() => setDrafts([])}
                        className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                      >
                        設定クリア
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {TIME_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => addSlot(preset)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition hover:opacity-90 ${preset.color}`}
                        >
                          + {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* スロット一覧 */}
                  {drafts.length > 0 ? (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">設定中の枠</label>
                      {drafts.map((draft, index) => {
                        const presetColor = TIME_PRESETS.find((p) => p.name === draft.slot_name)?.color || "bg-slate-500";
                        return (
                          <div
                            key={index}
                            className="rounded-xl border border-slate-200 overflow-hidden"
                          >
                            <div className={`px-3 py-2 ${draft.type === "closed" ? "bg-slate-700" : presetColor} text-white flex items-center justify-between`}>
                              <input
                                type="text"
                                className="bg-transparent text-sm font-medium placeholder-white/70 outline-none w-20"
                                value={draft.slot_name || ""}
                                onChange={(e) => updateSlot(index, { slot_name: e.target.value || null })}
                                placeholder="枠名"
                              />
                              <button
                                onClick={() => removeSlot(index)}
                                className="p-1 hover:bg-white/20 rounded transition"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="p-3 space-y-3 bg-slate-50/50">
                              <select
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                                value={draft.type}
                                onChange={(e) => updateSlot(index, { type: e.target.value as any })}
                              >
                                <option value="open">臨時オープン</option>
                                <option value="modify">時間変更</option>
                                <option value="closed">休診</option>
                              </select>

                              {draft.type !== "closed" && (
                                <>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-slate-500 block mb-1">開始</label>
                                      <input
                                        type="time"
                                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-sm"
                                        value={draft.start_time || ""}
                                        onChange={(e) => updateSlot(index, { start_time: e.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-500 block mb-1">終了</label>
                                      <input
                                        type="time"
                                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-sm"
                                        value={draft.end_time || ""}
                                        onChange={(e) => updateSlot(index, { end_time: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-500 block mb-1">同時予約数</label>
                                    <select
                                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                                      value={draft.capacity === "" ? "" : String(draft.capacity)}
                                      onChange={(e) =>
                                        updateSlot(index, {
                                          capacity: e.target.value === "" ? "" : Number(e.target.value),
                                        })
                                      }
                                    >
                                      <option value="">デフォルト</option>
                                      {[1, 2, 3, 4, 5].map((n) => (
                                        <option key={n} value={n}>{n}名</option>
                                      ))}
                                    </select>
                                  </div>
                                </>
                              )}
                              <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                value={draft.memo || ""}
                                onChange={(e) => updateSlot(index, { memo: e.target.value })}
                                placeholder="メモ（任意）"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-sm">
                      <div className="mb-2">設定なし</div>
                      <div className="text-xs">上のボタンから時間帯を追加してください</div>
                    </div>
                  )}

                  {/* カスタム追加 */}
                  <button
                    onClick={() => addSlot()}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition"
                  >
                    + カスタム時間帯を追加
                  </button>

                  {/* 保存ボタン */}
                  <button
                    onClick={saveAll}
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition"
                  >
                    {saving ? "保存中..." : "保存する"}
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">
                  カレンダーから日付を選択してください
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 凡例 */}
        <div className="mt-6 flex items-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-700"></span>
            <span>休診</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-500"></span>
            <span>午前</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span>午後</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
            <span>夜間</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-violet-500"></span>
            <span>複数枠</span>
          </div>
        </div>
      </div>
    </div>
  );
}
