"use client";

import dynamic from "next/dynamic";
import NextMonthAlert from "./_components/NextMonthAlert";
import NavCards from "./_components/NavCards";

const OverviewCalendar = dynamic(() => import("./_components/OverviewCalendar"), { ssr: false });

export default function ScheduleDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">予約枠管理</h1>
          <p className="text-slate-600 mt-1">ドクターの予約スケジュールを管理します</p>
        </div>

        {/* 翌月開放ステータス */}
        <NextMonthAlert />

        {/* まとめカレンダー（閲覧専用） */}
        <OverviewCalendar />

        {/* ナビカード */}
        <NavCards />
      </div>
    </div>
  );
}
