"use client";

// 定期プラン管理ページ（デモ用）
// モックデータを使用して定期課金プランの一覧表示・一時停止/再開を提供する

import { useState } from "react";
import { DEMO_SUBSCRIPTIONS, type DemoSubscription } from "../_data/mock";

type StatusFilter = "全て" | "有効" | "一時停止" | "解約済み";

const STATUS_COLORS: Record<DemoSubscription["status"], string> = {
  有効: "bg-green-50 text-green-700",
  一時停止: "bg-yellow-50 text-yellow-700",
  解約済み: "bg-red-50 text-red-700",
};

export default function DemoSubscriptionPlansPage() {
  const [subscriptions, setSubscriptions] = useState<DemoSubscription[]>([
    ...DEMO_SUBSCRIPTIONS,
  ]);
  const [filter, setFilter] = useState<StatusFilter>("全て");
  const [toast, setToast] = useState<string | null>(null);

  // トースト表示（3秒で自動非表示）
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 一時停止
  const pauseSubscription = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "一時停止" as const } : s
      )
    );
    showToast("プランを一時停止しました");
  };

  // 再開
  const resumeSubscription = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "有効" as const } : s
      )
    );
    showToast("プランを再開しました");
  };

  // フィルタリング
  const filtered =
    filter === "全て"
      ? subscriptions
      : subscriptions.filter((s) => s.status === filter);

  // サマリー算出
  const activeCount = subscriptions.filter((s) => s.status === "有効").length;
  const monthlyRevenue = subscriptions
    .filter((s) => s.status === "有効")
    .reduce((sum, s) => sum + s.amount, 0);
  const avgBillingCount =
    subscriptions.length > 0
      ? Math.round(
          (subscriptions.reduce((sum, s) => sum + s.billingCount, 0) /
            subscriptions.length) *
            10
        ) / 10
      : 0;

  const FILTERS: StatusFilter[] = ["全て", "有効", "一時停止", "解約済み"];

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* トースト */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}

      {/* ヘッダー */}
      <h1 className="text-2xl font-bold text-slate-800">定期プラン管理</h1>
      <p className="text-sm text-slate-500 mt-1">
        定期課金プランの一覧確認・ステータス変更ができます
      </p>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium">有効プラン数</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {activeCount}
            <span className="text-sm font-normal text-slate-400 ml-1">件</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium">月次売上合計</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            ¥{monthlyRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-medium">平均課金回数</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {avgBillingCount}
            <span className="text-sm font-normal text-slate-400 ml-1">回</span>
          </p>
        </div>
      </div>

      {/* フィルタ */}
      <div className="flex gap-2 mt-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f}
            {f !== "全て" && (
              <span className="ml-1 text-xs opacity-70">
                ({subscriptions.filter((s) => s.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 font-medium text-slate-500">患者名</th>
              <th className="px-4 py-3 font-medium text-slate-500">プラン名</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-right">金額</th>
              <th className="px-4 py-3 font-medium text-slate-500">間隔</th>
              <th className="px-4 py-3 font-medium text-slate-500">次回決済日</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-right">課金回数</th>
              <th className="px-4 py-3 font-medium text-slate-500">ステータス</th>
              <th className="px-4 py-3 font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sub) => (
              <tr
                key={sub.id}
                className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-slate-800">
                  {sub.patientName}
                </td>
                <td className="px-4 py-3 text-slate-600">{sub.plan}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">
                  ¥{sub.amount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-600">{sub.interval}</td>
                <td className="px-4 py-3 text-slate-600">
                  {sub.nextBillingDate || "—"}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {sub.billingCount}回
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                      STATUS_COLORS[sub.status]
                    }`}
                  >
                    {sub.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {sub.status === "有効" && (
                    <button
                      onClick={() => pauseSubscription(sub.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-yellow-300 text-yellow-700 hover:bg-yellow-50 transition-colors"
                    >
                      一時停止
                    </button>
                  )}
                  {sub.status === "一時停止" && (
                    <button
                      onClick={() => resumeSubscription(sub.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
                    >
                      再開
                    </button>
                  )}
                  {sub.status === "解約済み" && (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-slate-400"
                >
                  該当するプランがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
