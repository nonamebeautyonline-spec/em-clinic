"use client";

import React, { useEffect, useMemo, useState } from "react";

type Doctor = { doctor_id: string; doctor_name: string; is_active: boolean; sort_order: number; color?: string };
type WeeklyRule = {
  doctor_id: string;
  weekday: number; // 0..6
  enabled: boolean;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  capacity: number; // 1..2
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function defaultRules(doctor_id: string): WeeklyRule[] {
  // 初期：平日10-19 cap2 / 土日×
  return Array.from({ length: 7 }).map((_, weekday) => {
    const isWeekday = weekday >= 1 && weekday <= 5;
    return {
      doctor_id,
      weekday,
      enabled: isWeekday,
      start_time: isWeekday ? "10:00" : "",
      end_time: isWeekday ? "19:00" : "",
      slot_minutes: 15,
      capacity: 2,
    };
  });
}

export default function AdminRulesPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [rules, setRules] = useState<WeeklyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const activeDoctors = useMemo(() => doctors.filter((d) => d.is_active), [doctors]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        // schedule endpoint returns doctors + weekly_rules + overrides
        const start = "2000-01-01";
        const end = "2000-01-01";
        const res = await fetch(`/api/admin/schedule?start=${start}&end=${end}`, { cache: "no-store" });
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || "load_failed");
        setDoctors(json.doctors || []);
        const first = (json.doctors || []).find((d: Doctor) => d.is_active)?.doctor_id || "";
        setDoctorId(first);
      } catch (e: any) {
        setMsg(`読込エラー: ${String(e?.message || e)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    (async () => {
      setMsg("");
      // ルールだけ読みたいので schedule を doctor_id 指定で叩く
      const start = "2000-01-01";
      const end = "2000-01-01";
      const res = await fetch(`/api/admin/schedule?doctor_id=${doctorId}&start=${start}&end=${end}`, { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) {
        setRules(defaultRules(doctorId));
        setMsg("既存ルールが無いため初期値を表示しました。保存すると反映されます。");
        return;
      }
      const got: WeeklyRule[] = (json.weekly_rules || []).filter((r: WeeklyRule) => r.doctor_id === doctorId);
      setRules(got.length ? normalizeRules_(doctorId, got) : defaultRules(doctorId));
    })();
  }, [doctorId]);

  function normalizeRules_(doctor_id: string, got: WeeklyRule[]): WeeklyRule[] {
    const map = new Map<number, WeeklyRule>();
    got.forEach((r) => map.set(r.weekday, r));
    return Array.from({ length: 7 }).map((_, wd) => {
      const r = map.get(wd);
      return r
        ? { ...r, doctor_id, slot_minutes: Number(r.slot_minutes || 15), capacity: Number(r.capacity || 2), enabled: !!r.enabled }
        : defaultRules(doctor_id)[wd];
    });
  }

  function updateRule(weekday: number, patch: Partial<WeeklyRule>) {
    setRules((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
  }

  async function save() {
    if (!doctorId) return;
    setSaving(true);
    setMsg("");
    try {
      // バリデーション（最低限）
      for (const r of rules) {
        if (r.enabled) {
          if (!r.start_time || !r.end_time) throw new Error(`${WEEKDAYS[r.weekday]}: 開始/終了が未入力です`);
          if (r.capacity < 1 || r.capacity > 2) throw new Error(`${WEEKDAYS[r.weekday]}: 枠数は1〜2です`);
          if (r.slot_minutes !== 15) {
            // 今は15固定でOK。将来拡張用のガード。
          }
        }
      }

      const res = await fetch("/api/admin/weekly_rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: doctorId, rules }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "save_failed");
      setMsg("保存しました。");
      setRules(json.rules || rules);
    } catch (e: any) {
      setMsg(`保存エラー: ${String(e?.message || e)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-lg font-semibold">予約枠 管理：週間テンプレ</h1>
      <p className="text-sm text-slate-600 mt-1">ドクター別に「普段の営業時間・枠数」を設定します（例外は別画面）。</p>

      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm text-slate-700">ドクター</label>
        <select
          className="border rounded-md px-2 py-1 text-sm"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          disabled={loading}
        >
          {activeDoctors.map((d) => (
            <option key={d.doctor_id} value={d.doctor_id}>
              {d.doctor_name}（{d.doctor_id}）
            </option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={saving || !doctorId}
          className="ml-auto px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm disabled:opacity-60"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      {msg ? <div className="mt-3 text-sm text-slate-700">{msg}</div> : null}

      <div className="mt-4 border rounded-lg overflow-hidden">
        <div className="grid grid-cols-6 bg-slate-50 text-xs font-semibold text-slate-700">
          <div className="p-2">曜日</div>
          <div className="p-2">有効</div>
          <div className="p-2">開始</div>
          <div className="p-2">終了</div>
          <div className="p-2">枠数</div>
          <div className="p-2">間隔</div>
        </div>

        {rules.map((r) => (
          <div key={r.weekday} className="grid grid-cols-6 border-t text-sm items-center">
            <div className="p-2 font-medium">{WEEKDAYS[r.weekday]}</div>

            <div className="p-2">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => updateRule(r.weekday, { enabled: e.target.checked })}
              />
            </div>

            <div className="p-2">
              <input
                type="time"
                className="border rounded-md px-2 py-1 text-sm w-full disabled:bg-slate-100"
                value={r.start_time}
                onChange={(e) => updateRule(r.weekday, { start_time: e.target.value })}
                disabled={!r.enabled}
              />
            </div>

            <div className="p-2">
              <input
                type="time"
                className="border rounded-md px-2 py-1 text-sm w-full disabled:bg-slate-100"
                value={r.end_time}
                onChange={(e) => updateRule(r.weekday, { end_time: e.target.value })}
                disabled={!r.enabled}
              />
            </div>

            <div className="p-2">
              <select
                className="border rounded-md px-2 py-1 text-sm w-full disabled:bg-slate-100"
                value={String(r.capacity)}
                onChange={(e) => updateRule(r.weekday, { capacity: Number(e.target.value) })}
                disabled={!r.enabled}
              >
                <option value="1">1枠</option>
                <option value="2">2枠</option>
              </select>
            </div>

            <div className="p-2 text-slate-600 text-sm">{r.slot_minutes}分</div>
          </div>
        ))}
      </div>
    </div>
  );
}
