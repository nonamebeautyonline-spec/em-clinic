"use client";

import { useState, useCallback, useEffect } from "react";

type Props = {
  patientId: string;
  onSaved?: () => void;
};

type VitalFormData = {
  weight_kg: string;
  height_cm: string;
  bmi: string;
  systolic_bp: string;
  diastolic_bp: string;
  pulse: string;
  temperature: string;
  spo2: string;
  respiratory_rate: string;
  waist_cm: string;
  notes: string;
};

const INITIAL_FORM: VitalFormData = {
  weight_kg: "",
  height_cm: "",
  bmi: "",
  systolic_bp: "",
  diastolic_bp: "",
  pulse: "",
  temperature: "",
  spo2: "",
  respiratory_rate: "",
  waist_cm: "",
  notes: "",
};

// バイタルフィールド定義
const VITAL_FIELDS: {
  key: keyof VitalFormData;
  label: string;
  unit: string;
  placeholder: string;
  type: "decimal" | "integer";
}[] = [
  { key: "weight_kg", label: "体重", unit: "kg", placeholder: "65.0", type: "decimal" },
  { key: "height_cm", label: "身長", unit: "cm", placeholder: "170.0", type: "decimal" },
  { key: "bmi", label: "BMI", unit: "", placeholder: "自動計算", type: "decimal" },
  { key: "systolic_bp", label: "収縮期血圧", unit: "mmHg", placeholder: "120", type: "integer" },
  { key: "diastolic_bp", label: "拡張期血圧", unit: "mmHg", placeholder: "80", type: "integer" },
  { key: "pulse", label: "脈拍", unit: "bpm", placeholder: "72", type: "integer" },
  { key: "temperature", label: "体温", unit: "\u00B0C", placeholder: "36.5", type: "decimal" },
  { key: "spo2", label: "SpO2", unit: "%", placeholder: "98", type: "integer" },
  { key: "respiratory_rate", label: "呼吸数", unit: "回/分", placeholder: "16", type: "integer" },
  { key: "waist_cm", label: "腹囲", unit: "cm", placeholder: "85.0", type: "decimal" },
];

export function VitalsInputForm({ patientId, onSaved }: Props) {
  const [form, setForm] = useState<VitalFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BMI自動計算（体重・身長変更時）
  useEffect(() => {
    const weight = parseFloat(form.weight_kg);
    const height = parseFloat(form.height_cm);
    if (weight > 0 && height > 0) {
      const heightM = height / 100;
      const bmi = Math.round((weight / (heightM * heightM)) * 10) / 10;
      setForm((prev) => ({ ...prev, bmi: String(bmi) }));
    } else {
      setForm((prev) => ({ ...prev, bmi: "" }));
    }
  }, [form.weight_kg, form.height_cm]);

  const handleChange = useCallback((key: keyof VitalFormData, value: string) => {
    if (key === "bmi") return; // BMIは自動計算のみ
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // 入力されたフィールドのみ送信
      const payload: Record<string, unknown> = { patient_id: patientId };

      for (const field of VITAL_FIELDS) {
        const val = form[field.key];
        if (val === "" || val === undefined) continue;
        if (field.key === "bmi") continue; // BMIはサーバー側で計算

        const num = field.type === "integer" ? parseInt(val, 10) : parseFloat(val);
        if (!isNaN(num)) {
          payload[field.key] = num;
        }
      }

      // メモ
      if (form.notes.trim()) {
        payload.notes = form.notes.trim();
      }

      // 少なくとも1つのバイタル値が必要
      const hasVitals = VITAL_FIELDS.some(
        (f) => f.key !== "bmi" && form[f.key] !== ""
      );
      if (!hasVitals && !form.notes.trim()) {
        setError("少なくとも1つのバイタル値を入力してください");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || "保存に失敗しました");
      }

      // 成功: フォームリセット
      setForm(INITIAL_FORM);
      onSaved?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-slate-600">バイタル記録</h4>

      {/* 2カラムグリッド */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {VITAL_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center gap-1.5">
            <label className="text-[11px] text-slate-500 w-16 flex-shrink-0 text-right">
              {field.label}
            </label>
            <div className="flex-1 flex items-center gap-1">
              <input
                type="number"
                step={field.type === "decimal" ? "0.1" : "1"}
                className={`w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs ${
                  field.key === "bmi" ? "bg-slate-50 text-slate-400" : ""
                }`}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                disabled={field.key === "bmi"}
              />
              {field.unit && (
                <span className="text-[10px] text-slate-400 w-10 flex-shrink-0">
                  {field.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* メモ */}
      <div>
        <label className="text-[11px] text-slate-500 block mb-0.5">メモ</label>
        <textarea
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
          rows={2}
          placeholder="特記事項があれば入力"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      {/* エラー表示 */}
      {error && (
        <p className="text-[11px] text-red-500">{error}</p>
      )}

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg bg-pink-500 text-white text-xs font-medium hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "保存中..." : "バイタル保存"}
        </button>
      </div>
    </div>
  );
}
