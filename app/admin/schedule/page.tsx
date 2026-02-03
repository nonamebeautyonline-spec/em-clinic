"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Doctor = {
  doctor_id: string;
  doctor_name: string;
  is_active: boolean;
};

type Override = {
  doctor_id: string;
  date: string;
  type: string;
  memo?: string;
};

export default function ScheduleDashboard() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // 今月の範囲でデータ取得
        const now = new Date();
        const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

        const res = await fetch(`/api/admin/schedule?start=${start}&end=${end}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.ok) {
          setDoctors(json.doctors || []);
          setOverrides(json.overrides || []);
        }
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeDoctors = doctors.filter((d) => d.is_active);
  const thisMonthOverrides = overrides.length;
  const closedDays = overrides.filter((o) => o.type === "closed").length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-bold text-slate-800">予約枠管理</h1>
      <p className="text-sm text-slate-600 mt-1">
        ドクターの予約枠設定を管理します。週間テンプレートで基本設定、日別例外で特定日の変更を行います。
      </p>

      {/* ナビゲーションカード */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/schedule/doctors"
          className="block p-5 border rounded-lg hover:bg-slate-50 transition"
        >
          <div className="text-lg font-semibold text-slate-800">医師マスタ</div>
          <div className="text-sm text-slate-600 mt-1">
            医師の追加・編集・有効/無効の管理
          </div>
          <div className="mt-3 text-2xl font-bold text-blue-600">
            {loading ? "-" : activeDoctors.length}名
          </div>
        </Link>

        <Link
          href="/admin/schedule/weekly"
          className="block p-5 border rounded-lg hover:bg-slate-50 transition"
        >
          <div className="text-lg font-semibold text-slate-800">週間テンプレート</div>
          <div className="text-sm text-slate-600 mt-1">
            曜日ごとの営業時間・枠数の設定
          </div>
          <div className="mt-3 text-sm text-slate-500">
            月〜金 10:00-19:00 など
          </div>
        </Link>

        <Link
          href="/admin/schedule/overrides"
          className="block p-5 border rounded-lg hover:bg-slate-50 transition"
        >
          <div className="text-lg font-semibold text-slate-800">日別例外</div>
          <div className="text-sm text-slate-600 mt-1">
            特定日の休診・時間変更・臨時オープン
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-600">
            {loading ? "-" : thisMonthOverrides}件
            <span className="text-sm font-normal text-slate-500 ml-2">今月</span>
          </div>
        </Link>
      </div>

      {/* 今月のサマリー */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-800">今月の予定</h2>
        <div className="mt-3 border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-sm text-slate-500">読み込み中...</div>
          ) : overrides.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">
              今月の例外設定はありません（通常営業）
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-slate-600">日付</th>
                  <th className="px-4 py-2 text-left text-slate-600">種別</th>
                  <th className="px-4 py-2 text-left text-slate-600">メモ</th>
                </tr>
              </thead>
              <tbody>
                {overrides.slice(0, 10).map((o) => (
                  <tr key={`${o.doctor_id}-${o.date}`} className="border-t">
                    <td className="px-4 py-2">{o.date}</td>
                    <td className="px-4 py-2">
                      {o.type === "closed" && (
                        <span className="px-2 py-0.5 bg-slate-800 text-white text-xs rounded">
                          休診
                        </span>
                      )}
                      {o.type === "open" && (
                        <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs rounded">
                          臨時オープン
                        </span>
                      )}
                      {o.type === "modify" && (
                        <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded">
                          変更
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{o.memo || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {overrides.length > 10 && (
            <div className="px-4 py-2 text-sm text-slate-500 border-t">
              他{overrides.length - 10}件...{" "}
              <Link href="/admin/schedule/overrides" className="text-blue-600 hover:underline">
                すべて見る
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 休診日カウント */}
      {closedDays > 0 && (
        <div className="mt-4 p-3 bg-slate-100 rounded-lg text-sm text-slate-700">
          今月の休診日: <span className="font-bold">{closedDays}日</span>
        </div>
      )}
    </div>
  );
}
