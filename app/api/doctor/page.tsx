// app/doctor/page.tsx
"use client";

import { useEffect, useState } from "react";

type IntakeRow = {
  [key: string]: any;
};

export default function DoctorPage() {
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ① まずは GAS の doGet を直接叩くパターン（簡易版）
    // 後で /api/doctor/intakes に切り替えてもOK
    fetch(process.env.NEXT_PUBLIC_GAS_INTAKE_LIST_URL as string)
      .then((r) => r.json())
      .then((data) => {
        setRows(data || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-4">読み込み中...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold mb-2">診察一覧</h1>

      {rows.length === 0 && (
        <p className="text-sm text-slate-500">まだ問診データがありません。</p>
      )}

      {rows.map((row, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl shadow border p-4 space-y-2"
        >
          <div className="flex justify-between text-xs text-slate-500">
            <span>{row.timestamp || row["タイムスタンプ"] || ""}</span>
            <span>reserveId: {row.reserveId || ""}</span>
          </div>

          <div className="text-sm">
            <div>
              禁忌判定:{" "}
              {row.ng_check === "yes" ? (
                <span className="text-red-600 font-semibold">あり</span>
              ) : (
                <span className="text-emerald-600 font-semibold">なし</span>
              )}
            </div>
            <div className="mt-1">
              既往歴: {row.current_disease_detail || "なし"}
            </div>
            <div>
              内服薬: {row.med_detail || "なし"}
            </div>
            <div>
              アレルギー: {row.allergy_detail || "なし"}
            </div>
          </div>

          {/* 後でここに「処方OK / NG」ボタンを生やす */}
        </div>
      ))}
    </div>
  );
}
