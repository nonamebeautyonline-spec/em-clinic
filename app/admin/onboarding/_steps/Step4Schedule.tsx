"use client";

// Step 4: 診療スケジュール設定
import { useState } from "react";
import { StepNavigation } from "./Step1Line";

interface Props {
  completed: boolean;
  onNext: () => void;
  onBack: () => void;
}

const WEEKDAYS = [
  { id: 1, label: "月" },
  { id: 2, label: "火" },
  { id: 3, label: "水" },
  { id: 4, label: "木" },
  { id: 5, label: "金" },
  { id: 6, label: "土" },
  { id: 0, label: "日" },
];

// 時間帯の選択肢
const TIME_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2 + 8); // 8:00〜20:00
  const m = i % 2 === 0 ? "00" : "30";
  if (h > 20) return null;
  return `${String(h).padStart(2, "0")}:${m}`;
}).filter(Boolean) as string[];

export default function Step4Schedule({ completed, onNext, onBack }: Props) {
  const [doctorName, setDoctorName] = useState("");
  const [enabledDays, setEnabledDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("19:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const toggleDay = (dayId: number) => {
    setEnabledDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!doctorName.trim()) {
      setError("医師名は必須です");
      return;
    }
    if (enabledDays.size === 0) {
      setError("少なくとも1つの曜日を選択してください");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // 医師IDを生成（名前からスラグ化）
      const doctorId = `dr-${Date.now()}`;

      // 1. 医師を登録
      const doctorRes = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          doctor_id: doctorId,
          doctor_name: doctorName.trim(),
          is_active: true,
          sort_order: 0,
        }),
      });

      if (!doctorRes.ok) {
        const data = await doctorRes.json().catch(() => ({}));
        throw new Error(data?.error || "医師の登録に失敗しました");
      }

      // 2. 週次ルールを登録
      const rules = WEEKDAYS.map((day) => ({
        weekday: day.id,
        enabled: enabledDays.has(day.id),
        start_time: enabledDays.has(day.id) ? startTime : null,
        end_time: enabledDays.has(day.id) ? endTime : null,
        slot_minutes: 15,
        capacity: 2,
      }));

      const rulesRes = await fetch("/api/admin/weekly_rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ doctor_id: doctorId, rules }),
      });

      if (!rulesRes.ok) {
        const data = await rulesRes.json().catch(() => ({}));
        throw new Error(data?.error || "スケジュールの保存に失敗しました");
      }

      setSaved(true);
      setTimeout(() => onNext(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  // 完了済みの場合
  if (completed && !saved) {
    return (
      <div className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 mb-2">診療スケジュール</h2>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-800">診療スケジュールは設定済みです</p>
          </div>
          <p className="text-xs text-green-600 mt-1 ml-7">設定を変更する場合は、後からスケジュールページで編集できます</p>
        </div>
        <StepNavigation onBack={onBack} onNext={onNext} nextLabel="次へ（スキップ）" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-lg font-bold text-slate-900 mb-1">診療スケジュール</h2>
      <p className="text-sm text-slate-500 mb-6">
        医師と診療可能な曜日・時間帯を設定してください
      </p>

      {/* エラー */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 保存成功 */}
      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          スケジュールを保存しました
        </div>
      )}

      {/* 医師名 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          医師名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          placeholder="例: 田中太郎"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-slate-400">
          後からスケジュールページで医師を追加できます
        </p>
      </div>

      {/* 曜日選択 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-3">診療曜日</label>
        <div className="flex gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => toggleDay(day.id)}
              className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${
                enabledDays.has(day.id)
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* 時間帯 */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-700 mb-3">診療時間</label>
        <div className="flex items-center gap-3">
          <select
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={`start-${t}`} value={t}>{t}</option>
            ))}
          </select>
          <span className="text-slate-400">〜</span>
          <select
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={`end-${t}`} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          1枠15分 / 同時予約数2名がデフォルト設定です。後から変更できます。
        </p>
      </div>

      <StepNavigation
        onBack={onBack}
        onNext={handleSave}
        nextLabel={saving ? "保存中..." : "保存して次へ"}
        nextDisabled={saving || !doctorName.trim()}
        showSkip
        onSkip={onNext}
      />
    </div>
  );
}
