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
  const gridStart = addDays(start, -start.getDay());
  const gridEnd = addDays(end, 6 - end.getDay());
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(new Date(d));
  return { gridStart, gridEnd, days };
}

export default function OverridesPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [month, setMonth] = useState(() => new Date());
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [draft, setDraft] = useState<Override | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
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

  // ドクター一覧取得
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

  // ドクター・月変更時にoverrides取得
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

  // 今日をデフォルト選択
  useEffect(() => {
    if (!doctorId) return;
    const today = yyyyMmDd(new Date());
    setSelectedDate((prev) => prev || today);
  }, [doctorId]);

  // 日付選択時にdraft更新
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
    if (o.type === "closed")
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-white">休</span>;
    if (o.type === "open")
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white">開</span>;
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white">変</span>;
  }

  async function saveOverride() {
    if (!draft) return;
    setSaving(true);
    setMsg(null);
    try {
      if (draft.type !== "closed") {
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
      setMsg({ type: "success", text: "保存しました" });

      // リロード
      const r = await fetch(
        `/api/admin/schedule?doctor_id=${doctorId}&start=${rangeStart}&end=${rangeEnd}`,
        { cache: "no-store" }
      );
      const j = await r.json();
      setOverrides((j.overrides || []).filter((o: Override) => o.doctor_id === doctorId));
    } catch (e: any) {
      setMsg({ type: "error", text: `保存エラー: ${e?.message || e}` });
    } finally {
      setSaving(false);
    }
  }

  async function deleteOverride() {
    if (!draft) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/date_override", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: draft.doctor_id, date: draft.date }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "delete_failed");
      setMsg({ type: "success", text: "削除しました" });

      const r = await fetch(
        `/api/admin/schedule?doctor_id=${doctorId}&start=${rangeStart}&end=${rangeEnd}`,
        { cache: "no-store" }
      );
      const j = await r.json();
      setOverrides((j.overrides || []).filter((o: Override) => o.doctor_id === doctorId));
    } catch (e: any) {
      setMsg({ type: "error", text: `削除エラー: ${e?.message || e}` });
    } finally {
      setSaving(false);
    }
  }

  const isToday = (d: Date) => yyyyMmDd(d) === yyyyMmDd(new Date());
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* パンくず */}
      <div className="text-sm text-slate-500 mb-4">
        <Link href="/admin/schedule" className="hover:text-slate-700">
          予約枠管理
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">日別例外</span>
      </div>

      <h1 className="text-xl font-bold text-slate-800">日別例外</h1>
      <p className="text-sm text-slate-600 mt-1">
        特定日だけ休診にする、時間を変える、枠数を変えるなどの設定です。
      </p>

      {/* コントロール */}
      <div className="mt-6 flex items-center gap-4 flex-wrap">
        <div>
          <label className="text-sm text-slate-600 block mb-1">ドクター</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm min-w-[200px]"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          >
            {activeDoctors.map((d) => (
              <option key={d.doctor_id} value={d.doctor_id}>
                {d.doctor_name}（{d.doctor_id}）
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="px-4 py-2 rounded-lg border text-sm hover:bg-slate-50"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            前月
          </button>
          <div className="text-sm font-medium w-28 text-center">{monthLabel(month)}</div>
          <button
            className="px-4 py-2 rounded-lg border text-sm hover:bg-slate-50"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            次月
          </button>
        </div>
      </div>

      {/* メッセージ */}
      {msg && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            msg.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* カレンダー + エディタ */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* カレンダー */}
        <div className="lg:col-span-2 border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 text-xs font-semibold">
            {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
              <div
                key={w}
                className={`p-3 text-center ${
                  i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-slate-700"
                }`}
              >
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
                    "h-24 border-t border-r p-2 text-left align-top transition",
                    inMonth ? "bg-white hover:bg-slate-50" : "bg-slate-50 text-slate-400",
                    isSelected ? "ring-2 ring-slate-900 ring-inset" : "",
                    isToday(d) && inMonth ? "bg-blue-50" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`text-sm font-medium ${
                        isWeekend(d)
                          ? d.getDay() === 0
                            ? "text-red-600"
                            : "text-blue-600"
                          : ""
                      }`}
                    >
                      {d.getDate()}
                    </div>
                    {badgeFor(o)}
                  </div>
                  {o?.memo && (
                    <div className="mt-1 text-[11px] text-slate-600 line-clamp-2">{o.memo}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* エディタ */}
        <div className="border rounded-lg p-4">
          <div className="text-sm font-semibold text-slate-800">編集</div>
          <div className="text-xs text-slate-500 mt-1">{selectedDate || "日付を選択"}</div>

          {draft ? (
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-slate-600 block mb-1">種別</label>
                <select
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as any })}
                >
                  <option value="modify">変更（普段の設定を上書き）</option>
                  <option value="open">臨時オープン（普段休みでも開ける）</option>
                  <option value="closed">休診（全枠×）</option>
                </select>
              </div>

              {draft.type !== "closed" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">開始</label>
                      <input
                        type="time"
                        className="border rounded-lg px-3 py-2 text-sm w-full"
                        value={draft.start_time || ""}
                        onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">終了</label>
                      <input
                        type="time"
                        className="border rounded-lg px-3 py-2 text-sm w-full"
                        value={draft.end_time || ""}
                        onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 block mb-1">枠数</label>
                    <select
                      className="border rounded-lg px-3 py-2 text-sm w-full"
                      value={draft.capacity === "" ? "" : String(draft.capacity)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          capacity: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                    >
                      <option value="">（変更しない）</option>
                      <option value="1">1枠</option>
                      <option value="2">2枠</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-slate-600 block mb-1">メモ</label>
                <textarea
                  className="border rounded-lg px-3 py-2 text-sm w-full h-20 resize-none"
                  value={draft.memo || ""}
                  onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
                  placeholder="例：Dr私用のため休診 / 夜だけ開放 など"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveOverride}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50 hover:bg-slate-800"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
                <button
                  onClick={deleteOverride}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  削除
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-500">日付を選択してください。</div>
          )}
        </div>
      </div>

      {/* 凡例 */}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white">休</span>
          <span>休診</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white">開</span>
          <span>臨時オープン</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white">変</span>
          <span>時間/枠変更</span>
        </div>
      </div>
    </div>
  );
}
