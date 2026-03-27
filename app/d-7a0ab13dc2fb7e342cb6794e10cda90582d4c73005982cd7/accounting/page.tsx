"use client";

import { useState } from "react";
import { DEMO_PAYMENTS, type DemoPayment } from "../_data/mock";

// 日別売上集計
function aggregateByDate(payments: DemoPayment[]) {
  const map: Record<string, { date: string; total: number; cardTotal: number; bankTotal: number; count: number }> = {};
  for (const p of payments) {
    if (p.status !== "完了") continue;
    const date = p.paidAt.split(" ")[0];
    if (!map[date]) map[date] = { date, total: 0, cardTotal: 0, bankTotal: 0, count: 0 };
    map[date].total += p.amount;
    map[date].count += 1;
    if (p.method === "カード") map[date].cardTotal += p.amount;
    else map[date].bankTotal += p.amount;
  }
  return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
}

// 月間サマリー
function monthlySummary(payments: DemoPayment[]) {
  const completed = payments.filter((p) => p.status === "完了");
  const total = completed.reduce((s, p) => s + p.amount, 0);
  const cardTotal = completed.filter((p) => p.method === "カード").reduce((s, p) => s + p.amount, 0);
  const bankTotal = completed.filter((p) => p.method === "銀行振込").reduce((s, p) => s + p.amount, 0);
  return { total, cardTotal, bankTotal, count: completed.length };
}

export default function DemoAccountingPage() {
  const [payments] = useState<DemoPayment[]>(DEMO_PAYMENTS);
  const [period, setPeriod] = useState<"week" | "month">("month");

  const summary = monthlySummary(payments);
  const dailyData = aggregateByDate(payments);
  const maxRevenue = Math.max(...dailyData.map((d) => d.total), 1);

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">売上管理</h1>
        <p className="text-sm text-slate-500 mt-1">決済完了分の売上集計</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">月間売上</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">¥{summary.total.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">カード決済</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">¥{summary.cardTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">銀行振込</p>
          <p className="text-2xl font-bold text-green-600 mt-1">¥{summary.bankTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">決済件数</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{summary.count}件</p>
        </div>
      </div>

      {/* 期間切替 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPeriod("week")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === "week" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          直近7日
        </button>
        <button
          onClick={() => setPeriod("month")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === "month" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          今月
        </button>
      </div>

      {/* 日別棒グラフ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">日別売上</h2>
        <div className="space-y-2">
          {dailyData.slice(0, period === "week" ? 7 : 30).map((d) => (
            <div key={d.date} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-20 shrink-0">{d.date.slice(5)}</span>
              <div className="flex-1 flex items-center gap-1 h-6">
                <div
                  className="bg-blue-500 h-full rounded-l"
                  style={{ width: `${(d.cardTotal / maxRevenue) * 100}%` }}
                  title={`カード: ¥${d.cardTotal.toLocaleString()}`}
                />
                <div
                  className="bg-green-500 h-full rounded-r"
                  style={{ width: `${(d.bankTotal / maxRevenue) * 100}%` }}
                  title={`振込: ¥${d.bankTotal.toLocaleString()}`}
                />
              </div>
              <span className="text-xs font-medium text-slate-700 w-24 text-right">¥{d.total.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded inline-block" />カード</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded inline-block" />銀行振込</span>
        </div>
      </div>

      {/* 決済一覧 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">決済明細</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">日時</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">患者名</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">商品</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">金額</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">方法</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{p.paidAt}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{p.patientName}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.product}</td>
                  <td className="px-4 py-3 text-sm text-slate-800 text-right font-medium">¥{p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                      p.method === "カード" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                    }`}>
                      {p.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                      p.status === "完了" ? "bg-green-100 text-green-800" :
                      p.status === "未決済" ? "bg-yellow-100 text-yellow-800" :
                      p.status === "返金済み" ? "bg-purple-100 text-purple-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
