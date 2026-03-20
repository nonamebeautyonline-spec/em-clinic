// マッチ結果テーブル（完全一致） — プレビュー時と確定後の両方で使用
"use client";

import type { MatchedItem } from "./types";

interface MatchedTableProps {
  items: MatchedItem[];
  /** 確定後の結果表示モード（Payment ID・更新状態カラムを表示） */
  showResult?: boolean;
}

export default function MatchedTable({ items, showResult = false }: MatchedTableProps) {
  if (items.length === 0) return null;

  return (
    <div className={showResult ? "bg-white rounded-lg shadow overflow-hidden" : "overflow-x-auto"}>
      {showResult && (
        <div className="px-6 py-4 bg-green-50 border-b border-green-200">
          <h2 className="text-lg font-semibold text-green-900">
            マッチ成功（{items.length}件）
          </h2>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                振込日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                摘要（名義人）
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                患者ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                商品コード
              </th>
              {showResult && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Payment ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    更新状態
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {!showResult && "✅ "}{item.transfer.date}
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">
                  {item.transfer.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  ¥{item.transfer.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                  <button onClick={() => window.open(`/admin/line/talk?pid=${item.order.patient_id}`, '_blank')} className="text-blue-600 hover:text-blue-900 hover:underline">
                    {item.order.patient_id}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {item.order.product_code}
                </td>
                {showResult && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-green-600">
                      {item.newPaymentId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.updateSuccess ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          confirmed
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          失敗
                        </span>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
