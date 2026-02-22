"use client";

import { useState } from "react";
import { DEMO_REORDERS, type DemoReorder } from "../_data/mock";

const statusStyles: Record<string, string> = {
  "申請中": "bg-yellow-100 text-yellow-800",
  "承認済み": "bg-green-100 text-green-800",
  "決済済み": "bg-blue-100 text-blue-800",
  "発送済み": "bg-purple-100 text-purple-800",
  "拒否": "bg-red-100 text-red-800",
};

export default function DemoReordersPage() {
  const [reorders, setReorders] = useState<DemoReorder[]>(DEMO_REORDERS);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [expandedKarte, setExpandedKarte] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = (id: string) => {
    setReorders((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "承認済み" as const,
              karteNote: `副作用がなく、継続使用のため処方。${r.product}を処方。`,
            }
          : r
      )
    );
    showToast("再処方を承認しました");
  };

  const handleReject = (id: string) => {
    if (!confirm("この再処方申請を却下しますか？")) return;
    setReorders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "拒否" as const } : r))
    );
    showToast("再処方を却下しました");
  };

  const displayed = pendingOnly
    ? reorders.filter((r) => r.status === "申請中")
    : reorders;

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* トースト */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">再処方管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          再処方申請の確認・承認・却下
        </p>
      </div>

      {/* フィルタートグル */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setPendingOnly(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            pendingOnly
              ? "bg-slate-800 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          承認待ちのみ
        </button>
        <button
          onClick={() => setPendingOnly(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !pendingOnly
              ? "bg-slate-800 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          すべて表示
        </button>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  申請日時
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  患者名
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  前回商品
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  今回商品
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">
                  ステータス
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  カルテノート
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    該当する申請はありません
                  </td>
                </tr>
              )}
              {displayed.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                    {r.requestedAt}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {r.patientName}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {r.previousProduct}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {r.product}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs">
                    {r.karteNote ? (
                      <div>
                        <button
                          onClick={() =>
                            setExpandedKarte(
                              expandedKarte === r.id ? null : r.id
                            )
                          }
                          className="text-blue-600 hover:text-blue-800 text-xs underline"
                        >
                          {expandedKarte === r.id ? "閉じる" : "表示"}
                        </button>
                        {expandedKarte === r.id && (
                          <p className="mt-1 text-xs text-slate-500 whitespace-pre-wrap">
                            {r.karteNote}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "申請中" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-md text-xs font-medium hover:bg-green-600 transition-colors"
                        >
                          許可
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-md text-xs font-medium hover:bg-red-600 transition-colors"
                        >
                          却下
                        </button>
                      </div>
                    )}
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
