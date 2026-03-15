"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";

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

// 翌月の YYYY-MM 形式を取得
function getNextMonth() {
  const now = new Date();
  const nextMonth = now.getMonth() + 2; // 0-indexed + 1 for next month
  if (nextMonth > 12) {
    return `${now.getFullYear() + 1}-01`;
  }
  return `${now.getFullYear()}-${String(nextMonth).padStart(2, "0")}`;
}

// 翌月の日本語表示
function getNextMonthDisplay() {
  const now = new Date();
  const nextMonth = now.getMonth() + 2;
  if (nextMonth > 12) {
    return `${now.getFullYear() + 1}年1月`;
  }
  return `${now.getFullYear()}年${nextMonth}月`;
}


const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

export default function ScheduleDashboard() {
  const [openingNextMonth, setOpeningNextMonth] = useState(false);

  const nextMonthStr = getNextMonth();
  const nextMonthDisplay = getNextMonthDisplay();

  // 今月の日付範囲を計算
  const scheduleKey = useMemo(() => {
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    return `/api/admin/schedule?start=${start}&end=${end}`;
  }, []);

  const bookingOpenKey = `/api/admin/booking-open?month=${nextMonthStr}`;

  // スケジュールデータ取得
  const { data: scheduleData, isLoading: scheduleLoading } = useSWR<{ ok: boolean; doctors: Doctor[]; overrides: Override[] }>(scheduleKey);
  const doctors = scheduleData?.ok ? (scheduleData.doctors || []) : [];
  const overrides = scheduleData?.ok ? (scheduleData.overrides || []) : [];

  // 翌月の開放状態
  const { data: openData } = useSWR<{ ok: boolean; is_open: boolean }>(bookingOpenKey);
  const nextMonthOpen = openData?.ok ? openData.is_open : null;

  // 開放期限超過アラート
  const { data: alertData } = useSWR<{ alert: boolean }>("/api/admin/booking-open/alert");
  const isOverdue = alertData?.alert ?? false;

  const loading = scheduleLoading;

  // 翌月予約を早期開放
  async function openNextMonth() {
    if (!confirm(`${nextMonthDisplay}の予約を今すぐ開放しますか？`)) {
      return;
    }

    setOpeningNextMonth(true);
    try {
      const res = await fetch("/api/admin/booking-open", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ month: nextMonthStr }),
      });
      const json = await res.json();
      if (json.ok) {
        mutate(bookingOpenKey);
        alert(`${nextMonthDisplay}の予約を開放しました`);
      } else {
        alert(`エラー: ${(json.message || json.error) || "開放に失敗しました"}`);
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setOpeningNextMonth(false);
    }
  }

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

        {/* 翌月予約開放ステータス */}
        <div className={`mb-6 rounded-2xl border shadow-sm p-6 ${
          isOverdue ? "bg-red-50 border-red-300" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                nextMonthOpen
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                  : isOverdue
                    ? "bg-gradient-to-br from-red-500 to-red-600"
                    : "bg-gradient-to-br from-slate-400 to-slate-500"
              }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {nextMonthOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  )}
                </svg>
              </div>
              <div>
                <h3 className={`font-bold ${isOverdue ? "text-red-800" : "text-slate-800"}`}>{nextMonthDisplay}の予約</h3>
                <p className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-slate-500"}`}>
                  {nextMonthOpen
                    ? "開放済み"
                    : isOverdue
                      ? "開放期限を過ぎています。「今すぐ開放」で開放してください"
                      : "未開放（「今すぐ開放」で手動開放してください）"
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* ステータスバッジ */}
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                nextMonthOpen
                  ? "bg-emerald-100 text-emerald-700"
                  : isOverdue
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-600"
              }`}>
                {nextMonthOpen ? "開放中" : isOverdue ? "期限超過" : "未開放"}
              </span>

              {/* スケジュール設定ボタン */}
              <Link
                href="/admin/schedule/monthly"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg shadow-sm hover:from-blue-700 hover:to-blue-800 transition"
              >
                スケジュール設定
              </Link>
            </div>
          </div>
        </div>

        {/* ナビゲーションカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

          <Link
            href="/admin/schedule/settings"
            className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-violet-200 transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-50 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white text-xl mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800 group-hover:text-violet-600 transition">予約受付設定</h2>
              <p className="text-sm text-slate-500 mt-1">期限・受付期間の設定</p>
              <div className="mt-4 flex flex-wrap gap-1">
                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">変更期限</span>
                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">キャンセル期限</span>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/schedule/slots"
            className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-rose-200 transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-50 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white text-xl mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800 group-hover:text-rose-600 transition">予約枠・コース</h2>
              <p className="text-sm text-slate-500 mt-1">メニュー・コースの管理</p>
              <div className="mt-4 flex flex-wrap gap-1">
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs rounded-full">予約枠</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs rounded-full">コース</span>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/schedule/actions"
            className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-cyan-200 transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-50 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white text-xl mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800 group-hover:text-cyan-600 transition">予約アクション設定</h2>
              <p className="text-sm text-slate-500 mt-1">通知の送信設定</p>
              <div className="mt-4 flex flex-wrap gap-1">
                <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs rounded-full">予約完了</span>
                <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs rounded-full">変更</span>
                <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs rounded-full">キャンセル</span>
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
