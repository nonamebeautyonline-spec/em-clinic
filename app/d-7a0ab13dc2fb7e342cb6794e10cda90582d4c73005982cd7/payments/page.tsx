"use client";

import { useState, useMemo } from "react";
import { DEMO_PAYMENTS, type DemoPayment } from "../_data/mock";

// ステータスフィルタ
const STATUS_FILTERS = ["全て", "完了", "未決済", "返金済み", "失敗"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// ステータス色定義
const statusColors: Record<DemoPayment["status"], string> = {
  "完了": "bg-green-100 text-green-700",
  "未決済": "bg-yellow-100 text-yellow-700",
  "返金済み": "bg-purple-100 text-purple-700",
  "失敗": "bg-red-100 text-red-700",
};

// 金額フォーマット
function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export default function DemoPaymentsPage() {
  // 検索
  const [searchQuery, setSearchQuery] = useState("");
  // フィルタ
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("全て");

  // フィルタリング
  const filteredPayments = useMemo(() => {
    let result = [...DEMO_PAYMENTS];

    // ステータスフィルタ
    if (statusFilter !== "全て") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.patientName.toLowerCase().includes(query) ||
          p.product.toLowerCase().includes(query)
      );
    }

    return result;
  }, [statusFilter, searchQuery]);

  // 合計金額（完了分のみ）
  const totalCompleted = useMemo(() => {
    return filteredPayments
      .filter((p) => p.status === "完了")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  // 表示中の合計金額
  const totalAll = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  // 件数カウント
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { "全て": DEMO_PAYMENTS.length };
    for (const p of DEMO_PAYMENTS) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return counts;
  }, []);

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">決済管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          決済履歴の確認・検索・フィルタリング
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="総件数"
          value={`${DEMO_PAYMENTS.length}件`}
          color="blue"
        />
        <SummaryCard
          label="完了"
          value={`${statusCounts["完了"] ?? 0}件`}
          color="green"
        />
        <SummaryCard
          label="未決済"
          value={`${statusCounts["未決済"] ?? 0}件`}
          color="yellow"
        />
        <SummaryCard
          label="完了合計"
          value={formatYen(
            DEMO_PAYMENTS.filter((p) => p.status === "完了").reduce(
              (s, p) => s + p.amount,
              0
            )
          )}
          color="emerald"
        />
      </div>

      {/* 検索 + フィルタ */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* 検索ボックス */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="患者名・商品名で検索..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* ステータスフィルタ */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                statusFilter === filter
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {filter}
              <span className="ml-1 text-xs opacity-70">
                ({statusCounts[filter] ?? 0})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  日時
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  患者名
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  商品
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  決済方法
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ステータス
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment, idx) => (
                  <tr
                    key={payment.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      idx % 2 === 0 ? "" : "bg-slate-50/30"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {payment.paidAt}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                      {payment.patientName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {payment.product}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 font-medium text-right tabular-nums">
                      {formatYen(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          payment.method === "カード"
                            ? "text-blue-600"
                            : "text-amber-600"
                        }`}
                      >
                        {payment.method === "カード" ? (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        )}
                        {payment.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusColors[payment.status]
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    該当する決済データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* フッター: 合計 */}
        {filteredPayments.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <p className="text-sm text-slate-500">
              {filteredPayments.length}件表示中
            </p>
            <div className="flex gap-6">
              <div className="text-sm">
                <span className="text-slate-500">表示中合計: </span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {formatYen(totalAll)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">完了分合計: </span>
                <span className="font-bold text-emerald-600 tabular-nums">
                  {formatYen(totalCompleted)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// サマリーカード
function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <div
      className={`rounded-xl border p-4 ${colorMap[color] ?? colorMap.blue}`}
    >
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
