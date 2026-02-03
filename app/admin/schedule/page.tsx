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
  slot_name?: string | null;
  start_time?: string;
  end_time?: string;
  memo?: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

export default function ScheduleDashboard() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
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
  const now = new Date();
  const currentMonth = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">予約枠管理</h1>
          <p className="text-slate-600 mt-1">
            ドクターの予約スケジュールを管理します
          </p>
        </div>

        {/* ナビゲーションカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/schedule/doctors"
            className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-blue-200 transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition">医師マスタ</h2>
              <p className="text-sm text-slate-500 mt-1">医師の登録・編集</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">{loading ? "-" : activeDoctors.length}</span>
                <span className="text-sm text-slate-500">名登録中</span>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/schedule/weekly"
            className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-emerald-200 transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-50 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xl mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800 group-hover:text-emerald-600 transition">週間スケジュール</h2>
              <p className="text-sm text-slate-500 mt-1">曜日別の基本設定</p>
              <div className="mt-4 flex flex-wrap gap-1">
                {["月", "火", "水", "木", "金"].map((d) => (
                  <span key={d} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">{d}</span>
                ))}
              </div>
            </div>
          </Link>

          <Link
            href="/admin/schedule/overrides"
            className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-amber-200 transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-50 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-xl mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800 group-hover:text-amber-600 transition">日別スケジュール</h2>
              <p className="text-sm text-slate-500 mt-1">特定日の設定変更</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">{loading ? "-" : thisMonthOverrides}</span>
                <span className="text-sm text-slate-500">件（今月）</span>
              </div>
            </div>
          </Link>
        </div>

        {/* 今月のサマリー */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{currentMonth}のスケジュール</h2>
              <p className="text-sm text-slate-500">設定済みの日別スケジュール一覧</p>
            </div>
            {closedDays > 0 && (
              <div className="px-4 py-2 bg-slate-100 rounded-lg">
                <span className="text-sm text-slate-600">休診日</span>
                <span className="ml-2 text-lg font-bold text-slate-800">{closedDays}日</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="mt-2 text-sm">読み込み中...</p>
            </div>
          ) : overrides.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-500">今月の日別設定はありません</p>
              <p className="text-sm text-slate-400 mt-1">週間スケジュールに基づいて営業します</p>
              <Link
                href="/admin/schedule/overrides"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
              >
                日別設定を追加
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {overrides.slice(0, 10).map((o, i) => (
                <div
                  key={`${o.doctor_id}-${o.date}-${i}`}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50"
                >
                  <div className="w-16 text-center">
                    <div className="text-sm font-bold text-slate-800">{formatDate(o.date)}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {o.type === "closed" && (
                        <span className="px-2.5 py-1 bg-slate-700 text-white text-xs font-medium rounded-full">休診</span>
                      )}
                      {o.type === "open" && (
                        <span className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">臨時</span>
                      )}
                      {o.type === "modify" && (
                        <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">変更</span>
                      )}
                      {o.slot_name && (
                        <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">{o.slot_name}</span>
                      )}
                    </div>
                    {(o.start_time || o.memo) && (
                      <div className="mt-1 text-sm text-slate-500">
                        {o.start_time && o.end_time && `${o.start_time} - ${o.end_time}`}
                        {o.start_time && o.memo && " / "}
                        {o.memo}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {overrides.length > 10 && (
                <div className="px-6 py-4 text-center bg-slate-50/50">
                  <Link
                    href="/admin/schedule/overrides"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    他 {overrides.length - 10} 件を表示 →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
