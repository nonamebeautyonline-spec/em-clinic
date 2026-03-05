"use client";

import type { PatientVital } from "@/lib/validations/vitals";

type Props = {
  vitals: PatientVital[];
};

/** 日時を短い形式にフォーマット */
function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}/${m}/${day} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

/** 血圧をフォーマット */
function formatBP(sys: number | null, dia: number | null): string {
  if (sys == null && dia == null) return "-";
  return `${sys ?? "-"}/${dia ?? "-"}`;
}

/** 数値フォーマット（null時は"-"） */
function fmtNum(val: number | null, suffix = ""): string {
  if (val == null) return "-";
  return `${val}${suffix}`;
}

export function VitalsHistory({ vitals }: Props) {
  if (vitals.length === 0) {
    return (
      <div className="text-center text-sm text-gray-400 py-6">
        バイタルデータなし
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="text-left py-1.5 px-2 font-medium">日時</th>
            <th className="text-right py-1.5 px-2 font-medium">体重</th>
            <th className="text-right py-1.5 px-2 font-medium">BMI</th>
            <th className="text-right py-1.5 px-2 font-medium">血圧</th>
            <th className="text-right py-1.5 px-2 font-medium">脈拍</th>
            <th className="text-right py-1.5 px-2 font-medium">体温</th>
            <th className="text-right py-1.5 px-2 font-medium">SpO2</th>
            <th className="text-right py-1.5 px-2 font-medium">腹囲</th>
          </tr>
        </thead>
        <tbody>
          {vitals.map((v) => (
            <tr
              key={v.id}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-1.5 px-2 text-gray-600 whitespace-nowrap">
                {formatShortDate(v.measured_at)}
              </td>
              <td className="py-1.5 px-2 text-right text-gray-700">
                {fmtNum(v.weight_kg, "kg")}
              </td>
              <td className="py-1.5 px-2 text-right text-gray-700">
                {fmtNum(v.bmi)}
              </td>
              <td className="py-1.5 px-2 text-right text-gray-700 whitespace-nowrap">
                {formatBP(v.systolic_bp, v.diastolic_bp)}
              </td>
              <td className="py-1.5 px-2 text-right text-gray-700">
                {fmtNum(v.pulse)}
              </td>
              <td className="py-1.5 px-2 text-right text-gray-700">
                {fmtNum(v.temperature, "\u00B0C")}
              </td>
              <td className="py-1.5 px-2 text-right text-gray-700">
                {fmtNum(v.spo2, "%")}
              </td>
              <td className="py-1.5 px-2 text-right text-gray-700">
                {fmtNum(v.waist_cm, "cm")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
