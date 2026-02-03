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
const WEEKDAY_COLORS = [
  "text-red-600",    // 日
  "text-slate-800",  // 月
  "text-slate-800",  // 火
  "text-slate-800",  // 水
  "text-slate-800",  // 木
  "text-slate-800",  // 金
  "text-blue-600",   // 土
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

  // 初回ロード
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

  // ドクター変更時にルール取得
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
        setMsg({ type: "error", text: "既存ルールが無いため初期値を表示しました" });
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
      // バリデーション
      for (const r of rules) {
        if (r.enabled) {
          if (!r.start_time || !r.end_time) {
            throw new Error(`${WEEKDAYS[r.weekday]}曜: 開始/終了が未入力です`);
          }
          if (r.capacity < 1 || r.capacity > 2) {
            throw new Error(`${WEEKDAYS[r.weekday]}曜: 枠数は1〜2です`);
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
      setMsg({ type: "success", text: "保存しました" });
    } catch (e: any) {
      setMsg({ type: "error", text: `保存エラー: ${e?.message || e}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* パンくず */}
      <div className="text-sm text-slate-500 mb-4">
        <Link href="/admin/schedule" className="hover:text-slate-700">
          予約枠管理
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">週間テンプレート</span>
      </div>

      <h1 className="text-xl font-bold text-slate-800">週間テンプレート</h1>
      <p className="text-sm text-slate-600 mt-1">
        ドクター別に「普段の営業時間・枠数」を設定します。特定日の例外は日別例外で設定してください。
      </p>

      {/* ドクター選択 & 保存ボタン */}
      <div className="mt-6 flex items-center gap-4">
        <div>
          <label className="text-sm text-slate-600 block mb-1">ドクター</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm min-w-[200px]"
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
        </div>
        <button
          onClick={save}
          disabled={saving || !doctorId}
          className="ml-auto px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50 hover:bg-slate-800 transition"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      {/* メッセージ */}
      {msg && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            msg.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* テーブル */}
      <div className="mt-6 border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-slate-600 w-16">曜日</th>
              <th className="px-4 py-3 text-center text-slate-600 w-20">有効</th>
              <th className="px-4 py-3 text-left text-slate-600">開始</th>
              <th className="px-4 py-3 text-left text-slate-600">終了</th>
              <th className="px-4 py-3 text-left text-slate-600 w-24">枠数</th>
              <th className="px-4 py-3 text-left text-slate-600 w-20">間隔</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr
                key={r.weekday}
                className={`border-t ${!r.enabled ? "bg-slate-50" : ""}`}
              >
                <td className={`px-4 py-3 font-medium ${WEEKDAY_COLORS[r.weekday]}`}>
                  {WEEKDAYS[r.weekday]}
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) => updateRule(r.weekday, { enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="time"
                    className="border rounded-lg px-3 py-1.5 text-sm w-full disabled:bg-slate-100 disabled:text-slate-400"
                    value={r.start_time}
                    onChange={(e) => updateRule(r.weekday, { start_time: e.target.value })}
                    disabled={!r.enabled}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="time"
                    className="border rounded-lg px-3 py-1.5 text-sm w-full disabled:bg-slate-100 disabled:text-slate-400"
                    value={r.end_time}
                    onChange={(e) => updateRule(r.weekday, { end_time: e.target.value })}
                    disabled={!r.enabled}
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    className="border rounded-lg px-3 py-1.5 text-sm w-full disabled:bg-slate-100 disabled:text-slate-400"
                    value={String(r.capacity)}
                    onChange={(e) => updateRule(r.weekday, { capacity: Number(e.target.value) })}
                    disabled={!r.enabled}
                  >
                    <option value="1">1枠</option>
                    <option value="2">2枠</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-500">{r.slot_minutes}分</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 説明 */}
      <div className="mt-4 text-xs text-slate-500">
        <p>・「有効」をオフにすると、その曜日は予約不可になります</p>
        <p>・「枠数」は1コマあたりの最大予約人数です</p>
        <p>・特定日のみ変更したい場合は「日別例外」を使用してください</p>
      </div>
    </div>
  );
}
