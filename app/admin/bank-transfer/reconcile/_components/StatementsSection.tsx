// 入出金詳細セクション（月別明細テーブル・手動紐づけ起点）
"use client";

import type { BankStatement } from "./types";

interface MonthData {
  data: BankStatement[];
  total: number;
  page: number;
  loading: boolean;
}

interface StatementsSectionProps {
  months: string[];
  monthData: Record<string, MonthData>;
  filter: "all" | "reconciled" | "unreconciled";
  selectedStatements: Set<number>;
  onFilterChange: (filter: "all" | "reconciled" | "unreconciled") => void;
  onPageChange: (month: string, page: number) => void;
  onSelectedStatementsChange: (selected: Set<number>) => void;
  onLinkSingle: (statement: BankStatement) => void;
  onLinkMulti: (statements: BankStatement[]) => void;
}

export default function StatementsSection({
  months,
  monthData,
  filter,
  selectedStatements,
  onFilterChange,
  onPageChange,
  onSelectedStatementsChange,
  onLinkSingle,
  onLinkMulti,
}: StatementsSectionProps) {
  if (months.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">入出金詳細</h2>
            <p className="text-sm text-slate-600 mt-1">CSVから取り込んだ入出金明細</p>
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          {([
            { value: "unreconciled" as const, label: "未照合" },
            { value: "reconciled" as const, label: "照合済み" },
            { value: "all" as const, label: "全て" },
          ]).map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="stmtFilter"
                checked={filter === opt.value}
                onChange={() => onFilterChange(opt.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-slate-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 各月の明細 */}
      {months.map((m, i) => {
        const monthInfo = monthData[m];
        const monthLabel = (() => {
          const [y, mo] = m.split("-");
          return i === 0 ? `${parseInt(mo)}月（最新）` : `${y}年${parseInt(mo)}月`;
        })();
        return (
          <div key={m} className="border-t border-slate-200">
            <div className="px-6 py-3 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                {monthLabel}
                {monthInfo && <span className="ml-2 text-xs font-normal text-slate-500">（{monthInfo.total}件）</span>}
              </h3>
              {monthInfo && (() => {
                const monthSelectedIds = monthInfo.data.filter((s) => selectedStatements.has(s.id)).map((s) => s.id);
                if (monthSelectedIds.length < 2) return null;
                const selectedItems = monthInfo.data.filter((s) => selectedStatements.has(s.id));
                const totalDeposit = selectedItems.reduce((sum, s) => sum + s.deposit, 0);
                return (
                  <button
                    onClick={() => onLinkMulti(selectedItems)}
                    className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    選択した{monthSelectedIds.length}件を合算紐づけ（¥{totalDeposit.toLocaleString()}）
                  </button>
                );
              })()}
            </div>
            {!monthInfo || monthInfo.loading ? (
              <div className="p-6 text-center text-slate-500 text-sm">読み込み中...</div>
            ) : monthInfo.data.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">該当する明細がありません</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-2 py-3 text-center text-xs font-medium text-slate-500 uppercase w-10"></th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">日付</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">摘要</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">入金</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">出金</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">照合</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {monthInfo.data.map((s) => (
                        <tr key={s.id} className={`hover:bg-slate-50 ${selectedStatements.has(s.id) ? "bg-purple-50" : ""}`}>
                          <td className="px-2 py-3 text-center">
                            {s.deposit > 0 && !s.reconciled && (
                              <input
                                type="checkbox"
                                checked={selectedStatements.has(s.id)}
                                onChange={(e) => {
                                  const next = new Set(selectedStatements);
                                  if (e.target.checked) {
                                    next.add(s.id);
                                  } else {
                                    next.delete(s.id);
                                  }
                                  onSelectedStatementsChange(next);
                                }}
                                className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            <div>{s.transaction_date}</div>
                            {s.uploaded_at && (
                              <div className="text-xs text-slate-400">
                                {new Date(s.uploaded_at).toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 取込
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900 max-w-xs truncate">
                            {s.description}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-700">
                            {s.deposit > 0 ? `¥${s.deposit.toLocaleString()}` : ""}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-red-600">
                            {s.withdrawal > 0 ? `¥${s.withdrawal.toLocaleString()}` : ""}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {s.deposit > 0 ? (
                              s.reconciled ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  済
                                </span>
                              ) : (
                                <button
                                  onClick={() => onLinkSingle(s)}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer"
                                >
                                  未 → 紐づけ
                                </button>
                              )
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ページネーション */}
                {monthInfo.total > 50 && (
                  <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      {monthInfo.total}件中 {(monthInfo.page - 1) * 50 + 1}〜{Math.min(monthInfo.page * 50, monthInfo.total)}件
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onPageChange(m, monthInfo.page - 1)}
                        disabled={monthInfo.page <= 1}
                        className="px-3 py-1 text-sm rounded border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                      >
                        前へ
                      </button>
                      <span className="px-3 py-1 text-sm text-slate-600">
                        {monthInfo.page} / {Math.ceil(monthInfo.total / 50)}
                      </span>
                      <button
                        onClick={() => onPageChange(m, monthInfo.page + 1)}
                        disabled={monthInfo.page * 50 >= monthInfo.total}
                        className="px-3 py-1 text-sm rounded border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                      >
                        次へ
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
