// 照合結果サマリー（件数表示）
"use client";

import type { ReconcileResult } from "./types";

interface ReconcileSummaryProps {
  result: ReconcileResult;
}

export default function ReconcileSummary({ result }: ReconcileSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">照合結果サマリー</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">CSV総行数</p>
          <p className="text-2xl font-bold text-slate-900">{result.summary.total}</p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">マッチ成功</p>
          <p className="text-2xl font-bold text-green-700">{result.summary.matched}</p>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">DB更新完了</p>
          <p className="text-2xl font-bold text-blue-700">{result.summary.updated}</p>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-700">未マッチ</p>
          <p className="text-2xl font-bold text-yellow-700">{result.summary.unmatched}</p>
        </div>
      </div>
    </div>
  );
}
