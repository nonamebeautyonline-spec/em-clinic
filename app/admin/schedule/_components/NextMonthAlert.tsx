"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

function getNextMonth() {
  const now = new Date();
  const nextMonth = now.getMonth() + 2;
  if (nextMonth > 12) {
    return `${now.getFullYear() + 1}-01`;
  }
  return `${now.getFullYear()}-${String(nextMonth).padStart(2, "0")}`;
}

function getNextMonthDisplay() {
  const now = new Date();
  const nextMonth = now.getMonth() + 2;
  if (nextMonth > 12) {
    return `${now.getFullYear() + 1}年1月`;
  }
  return `${now.getFullYear()}年${nextMonth}月`;
}

export default function NextMonthAlert() {
  const [opening, setOpening] = useState(false);
  const nextMonthStr = getNextMonth();
  const nextMonthDisplay = getNextMonthDisplay();
  const bookingOpenKey = `/api/admin/booking-open?month=${nextMonthStr}`;

  const { data: openData } = useSWR<{ ok: boolean; is_open: boolean }>(bookingOpenKey);
  const { data: alertData } = useSWR<{ alert: boolean }>("/api/admin/booking-open/alert");

  const nextMonthOpen = openData?.ok ? openData.is_open : null;
  const isOverdue = alertData?.alert ?? false;

  async function openNextMonth() {
    if (!confirm(`${nextMonthDisplay}の予約を今すぐ開放しますか？`)) return;
    setOpening(true);
    try {
      const res = await fetch("/api/admin/booking-open", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: nextMonthStr }),
      });
      const json = await res.json();
      if (json.ok) {
        mutate(bookingOpenKey);
        alert(`${nextMonthDisplay}の予約を開放しました`);
      } else {
        alert(`エラー: ${json.message || json.error || "開放に失敗しました"}`);
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setOpening(false);
    }
  }

  if (nextMonthOpen === null) return null;

  // 開放済み: シンプルな緑バナー
  if (nextMonthOpen) {
    return (
      <div className="mb-6 flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-sm font-medium text-emerald-800">
          {nextMonthDisplay}の予約は開放済みです
        </span>
        <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          開放中
        </span>
      </div>
    );
  }

  // 期限超過: 赤アラート
  if (isOverdue) {
    return (
      <div className="mb-6 flex items-center gap-3 px-5 py-3 rounded-xl bg-red-50 border border-red-300">
        <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-red-800">{nextMonthDisplay}の予約が未開放です</span>
          <span className="ml-2 text-xs text-red-600">開放期限を過ぎています</span>
        </div>
        <button
          onClick={openNextMonth}
          disabled={opening}
          className="flex-shrink-0 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
        >
          {opening ? "開放中..." : "今すぐ開放"}
        </button>
      </div>
    );
  }

  // 未開放（期限内）
  return (
    <div className="mb-6 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-50 border border-slate-200">
      <div className="w-8 h-8 rounded-lg bg-slate-400 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <span className="text-sm text-slate-600">{nextMonthDisplay}の予約は未開放です</span>
      <button
        onClick={openNextMonth}
        disabled={opening}
        className="ml-auto flex-shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {opening ? "開放中..." : "開放する"}
      </button>
    </div>
  );
}
