"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Doctor = {
  doctor_id: string;
  doctor_name: string;
  is_active: boolean;
  sort_order: number;
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

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const WEEKDAY_FULL = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
const WEEKDAY_COLORS = [
  "from-red-500 to-red-600",     // 日
  "from-slate-600 to-slate-700", // 月
  "from-slate-600 to-slate-700", // 火
  "from-slate-600 to-slate-700", // 水
  "from-slate-600 to-slate-700", // 木
  "from-slate-600 to-slate-700", // 金
  "from-blue-500 to-blue-600",   // 土
];

function defaultRules(doctor_id: string): WeeklyRule[] {
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

export default function WeeklyRulesPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [rules, setRules] = useState<WeeklyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeDoctors = useMemo(() => doctors.filter((d) => d.is_active), [doctors]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/schedule?start=2000-01-01&end=2000-01-01", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || "load_failed");
        setDoctors(json.doctors || []);
        const first = (json.doctors || []).find((d: Doctor) => d.is_active)?.doctor_id || "";
        setDoctorId(first);
      } catch (e: any) {
        setMsg({ type: "error", text: `読込エラー: ${e?.message || e}` });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    (async () => {
      setMsg(null);
      const res = await fetch(`/api/admin/schedule?doctor_id=${doctorId}&start=2000-01-01&end=2000-01-01`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!json?.ok) {
        setRules(defaultRules(doctorId));
        return;
      }
      const got: WeeklyRule[] = (json.weekly_rules || []).filter(
        (r: WeeklyRule) => r.doctor_id === doctorId
      );
      setRules(got.length ? normalizeRules(doctorId, got) : defaultRules(doctorId));
    })();
  }, [doctorId]);

  function normalizeRules(doctor_id: string, got: WeeklyRule[]): WeeklyRule[] {
    const map = new Map<number, WeeklyRule>();
    got.forEach((r) => map.set(r.weekday, r));
    return Array.from({ length: 7 }).map((_, wd) => {
      const r = map.get(wd);
      return r
        ? {
            ...r,
            doctor_id,
            slot_minutes: Number(r.slot_minutes || 15),
            capacity: Number(r.capacity || 2),
            enabled: !!r.enabled,
          }
        : defaultRules(doctor_id)[wd];
    });
  }

  function updateRule(weekday: number, patch: Partial<WeeklyRule>) {
    setRules((prev) =>
      prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r))
    );
  }

  async function save() {
    if (!doctorId) return;
    setSaving(true);
    setMsg(null);
    try {
      for (const r of rules) {
        if (r.enabled) {
          if (!r.start_time || !r.end_time) {
            throw new Error(`${WEEKDAYS[r.weekday]}曜日の開始・終了時間を入力してください`);
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
      setMsg({ type: "success", text: "設定を保存しました" });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  // 営業日数をカウント
  const activeDays = rules.filter((r) => r.enabled).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/admin/schedule" className="hover:text-slate-700 transition">
              予約枠管理
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">週間スケジュール</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">週間スケジュール</h1>
              <p className="text-slate-600 mt-1">
                曜日ごとの基本営業時間を設定します
              </p>
            </div>
            <select
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              disabled={loading}
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

        {/* サマリー */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 uppercase tracking-wider">営業日</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{activeDays}日/週</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 uppercase tracking-wider">定休日</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{7 - activeDays}日/週</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 uppercase tracking-wider">予約間隔</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">15分</div>
          </div>
        </div>

        {/* 週間グリッド */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7">
            {rules.map((r) => (
              <div
                key={r.weekday}
                className={`border-r last:border-r-0 border-slate-100 ${
                  r.enabled ? "" : "bg-slate-50/50"
                }`}
              >
                {/* 曜日ヘッダー */}
                <div
                  className={`p-4 text-center bg-gradient-to-b ${WEEKDAY_COLORS[r.weekday]} text-white`}
                >
                  <div className="text-lg font-bold">{WEEKDAYS[r.weekday]}</div>
                  <div className="text-xs opacity-80">{WEEKDAY_FULL[r.weekday]}</div>
                </div>

                {/* 設定エリア */}
                <div className="p-4 space-y-4">
                  {/* 有効/無効トグル */}
                  <div className="flex items-center justify-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={(e) => updateRule(r.weekday, { enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-2 text-xs font-medium text-slate-600">
                        {r.enabled ? "営業" : "休業"}
                      </span>
                    </label>
                  </div>

                  {r.enabled ? (
                    <>
                      {/* 時間設定 */}
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">開始時間</label>
                          <input
                            type="time"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center"
                            value={r.start_time}
                            onChange={(e) => updateRule(r.weekday, { start_time: e.target.value })}
                          />
                        </div>
                        <div className="flex justify-center">
                          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">終了時間</label>
                          <input
                            type="time"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center"
                            value={r.end_time}
                            onChange={(e) => updateRule(r.weekday, { end_time: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* 枠数 */}
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">同時予約数</label>
                        <select
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center bg-white"
                          value={String(r.capacity)}
                          onChange={(e) => updateRule(r.weekday, { capacity: Number(e.target.value) })}
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}名</option>
                          ))}
                        </select>
                      </div>

                      {/* 時間表示 */}
                      {r.start_time && r.end_time && (
                        <div className="text-center pt-2 border-t border-slate-100">
                          <div className="text-xs text-slate-500">営業時間</div>
                          <div className="text-sm font-semibold text-slate-800">
                            {r.start_time} - {r.end_time}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="text-slate-400">
                        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <div className="text-xs">定休日</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={save}
            disabled={saving || !doctorId}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition"
          >
            {saving ? "保存中..." : "設定を保存する"}
          </button>
        </div>

        {/* 説明 */}
        <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h3 className="font-medium text-slate-700 mb-2">設定について</h3>
          <ul className="text-xs text-slate-500 space-y-1">
            <li>・ここで設定した内容が基本の営業スケジュールになります</li>
            <li>・特定の日だけ変更したい場合は「日別スケジュール設定」をご利用ください</li>
            <li>・変更は「設定を保存する」ボタンを押すまで反映されません</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
