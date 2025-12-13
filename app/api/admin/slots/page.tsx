"use client";

import React, { useEffect, useMemo, useState } from "react";

type Doctor = { doctor_id: string; doctor_name: string; is_active: boolean; sort_order: number; color?: string };
type WeeklyRule = {
  doctor_id: string;
  weekday: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  capacity: number;
};
type Override = {
  doctor_id: string;
  date: string; // YYYY-MM-DD
  type: "closed" | "open" | "modify";
  start_time?: string;
  end_time?: string;
  slot_minutes?: number | "";
  capacity?: number | "";
  memo?: string;
};

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

  // grid start: Sunday of the first week
  const gridStart = addDays(start, -start.getDay());
  // grid end: Saturday of the last week
  const gridEnd = addDays(end, 6 - end.getDay());

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(new Date(d));
  return { gridStart, gridEnd, days };
}

export default function AdminSlotsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [month, setMonth] = useState(() => new Date());
  const [weekly, setWeekly] = useState<WeeklyRule[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const [draft, setDraft] = useState<Override | null>(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const activeDoctors = useMemo(() => doctors.filter((d) => d.is_active), [doctors]);

  const { gridStart, gridEnd, days } = useMemo(() => toGridDates(month), [month]);
  const rangeStart = useMemo(() => yyyyMmDd(gridStart), [gridStart]);
  const rangeEnd = useMemo(() => yyyyMmDd(gridEnd), [gridEnd]);

  const overrideMap = useMemo(() => {
    const m = new Map<string, Override>();
    overrides.forEach((o) => m.set(o.date, o));
    return m;
  }, [overrides]);

  useEffect(() => {
    (async () => {
      setMsg("");
      const res = await fetch(`/api/admin/schedule?start=${rangeStart}&end=${rangeEnd}`, { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) {
        setMsg("読込エラー");
        return;
      }
      setDoctors(json.doctors || []);
      const first = (json.doctors || []).find((d: Doctor) => d.is_active)?.doctor_id || "";
      setDoctorId((prev) => prev || first);
    })();
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    if (!doctorId) return;
    (async () => {
      setMsg("");
      const res = await fetch(`/api/admin/schedule?doctor_id=${doctorId}&start=${rangeStart}&end=${rangeEnd}`, { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) {
        setWeekly([]);
        setOverrides([]);
        setMsg("読込エラー");
        return;
      }
      setWeekly((json.weekly_rules || []).filter((r: WeeklyRule) => r.doctor_id === doctorId));
      setOverrides((json.overrides || []).filter((o: Override) => o.doctor_id === doctorId));
    })();
  }, [doctorId, rangeStart, rangeEnd]);

  useEffect(() => {
    if (!doctorId) return;
    // default select: today
    const today = yyyyMmDd(new Date());
    setSelectedDate((prev) => prev || today);
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId || !selectedDate) return;
    const existing = overrideMap.get(selectedDate);
    setDraft(
      existing
        ? { ...existing }
        : {
            doctor_id: doctorId,
            date: selectedDate,
            type: "modify",
            start_time: "",
            end_time: "",
            capacity: "",
            slot_minutes: "",
            memo: "",
          }
    );
  }, [doctorId, selectedDate, overrideMap]);

  function monthLabel(d: Date) {
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  }

  function badgeFor(o?: Override) {
    if (!o) return null;
    if (o.type === "closed") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-white">休</span>;
    if (o.type === "open") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white">開</span>;
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white">変</span>;
  }

  async function saveOverride() {
    if (!draft) return;
    setSaving(true);
    setMsg("");
    try {
      if (draft.type !== "closed") {
        // open/modify は start/end どちらか入れるなら両方推奨（空でも保存可にしておく）
        if ((draft.start_time && !draft.end_time) || (!draft.start_time && draft.end_time)) {
          throw new Error("開始/終了は両方入力してください（または両方空）");
        }
        if (draft.capacity !== "" && (Number(draft.capacity) < 1 || Number(draft.capacity) > 2)) {
          throw new Error("枠数は1〜2です");
        }
      }

      const res = await fetch("/api/admin/date_override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ override: draft }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "save_failed");
      setMsg("保存しました。");

      // reload range
      const r = await fetch(`/api/admin/schedule?doctor_id=${doctorId}&start=${rangeStart}&end=${rangeEnd}`, { cache: "no-store" });
      const j = await r.json();
      setOverrides((j.overrides || []).filter((o: Override) => o.doctor_id === doctorId));
    } catch (e: any) {
      setMsg(`保存エラー: ${String(e?.message || e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteOverride() {
    if (!draft) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/date_override", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: draft.doctor_id, date: draft.date }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "delete_failed");
      setMsg("削除しました。");

      const r = await fetch(`/api/admin/schedule?doctor_id=${doctorId}&start=${rangeStart}&end=${rangeEnd}`, { cache: "no-store" });
      const j = await r.json();
      setOverrides((j.overrides || []).filter((o: Override) => o.doctor_id === doctorId));
    } catch (e: any) {
      setMsg(`削除エラー: ${String(e?.message || e)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-lg font-semibold">予約枠 管理：日別の例外（休診/延長/短縮/枠数）</h1>
      <p className="text-sm text-slate-600 mt-1">ドクター別に、特定日だけ休みにする/時間を変える/枠数を変える設定です。</p>

      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm text-slate-700">ドクター</label>
        <select className="border rounded-md px-2 py-1 text-sm" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          {activeDoctors.map((d) => (
            <option key={d.doctor_id} value={d.doctor_id}>
              {d.doctor_name}（{d.doctor_id}）
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-md border text-sm"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            ← 前月
          </button>
          <div className="text-sm font-medium">{monthLabel(month)}</div>
          <button
            className="px-3 py-1.5 rounded-md border text-sm"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            次月 →
          </button>
        </div>
      </div>

      {msg ? <div className="mt-3 text-sm text-slate-700">{msg}</div> : null}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="md:col-span-2 border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 text-xs font-semibold text-slate-700">
            {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
              <div key={w} className="p-2">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((d) => {
              const date = yyyyMmDd(d);
              const inMonth = d.getMonth() === month.getMonth();
              const isSelected = date === selectedDate;
              const o = overrideMap.get(date);

              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={[
                    "h-20 border-t border-r p-2 text-left align-top",
                    inMonth ? "bg-white" : "bg-slate-50 text-slate-400",
                    isSelected ? "outline outline-2 outline-slate-900" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-medium">{d.getDate()}</div>
                    {badgeFor(o)}
                  </div>
                  {o?.memo ? <div className="mt-1 text-[11px] text-slate-600 line-clamp-2">{o.memo}</div> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="border rounded-lg p-3">
          <div className="text-sm font-semibold">編集</div>
          <div className="text-xs text-slate-600 mt-1">{selectedDate || "-"}</div>

          {draft ? (
            <>
              <div className="mt-3">
                <label className="text-xs text-slate-700">種別</label>
                <select
                  className="mt-1 border rounded-md px-2 py-1 text-sm w-full"
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as any })}
                >
                  <option value="modify">変更（普段の設定を上書き）</option>
                  <option value="open">臨時オープン（普段休みでも開ける）</option>
                  <option value="closed">休診（全枠×）</option>
                </select>
              </div>

              {draft.type !== "closed" ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-700">開始</label>
                      <input
                        type="time"
                        className="mt-1 border rounded-md px-2 py-1 text-sm w-full"
                        value={draft.start_time || ""}
                        onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-700">終了</label>
                      <input
                        type="time"
                        className="mt-1 border rounded-md px-2 py-1 text-sm w-full"
                        value={draft.end_time || ""}
                        onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs text-slate-700">枠数（最大2）</label>
                    <select
                      className="mt-1 border rounded-md px-2 py-1 text-sm w-full"
                      value={draft.capacity === "" ? "" : String(draft.capacity)}
                      onChange={(e) => setDraft({ ...draft, capacity: e.target.value === "" ? "" : Number(e.target.value) })}
                    >
                      <option value="">（変更しない）</option>
                      <option value="1">1枠</option>
                      <option value="2">2枠</option>
                    </select>
                  </div>
                </>
              ) : null}

              <div className="mt-3">
                <label className="text-xs text-slate-700">メモ</label>
                <textarea
                  className="mt-1 border rounded-md px-2 py-1 text-sm w-full h-20"
                  value={draft.memo || ""}
                  onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
                  placeholder="例：Dr私用のため休診 / 夜だけ開放 など"
                />
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={saveOverride}
                  disabled={saving}
                  className="flex-1 px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm disabled:opacity-60"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
                <button onClick={deleteOverride} disabled={saving} className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-60">
                  削除
                </button>
              </div>

              <div className="mt-3 text-[11px] text-slate-600">
                「休診」は type=closed です。時間/枠数を空にして保存すれば「メモだけ」も可能です。
              </div>
            </>
          ) : (
            <div className="mt-3 text-sm text-slate-600">日付を選択してください。</div>
          )}
        </div>
      </div>
    </div>
  );
}
