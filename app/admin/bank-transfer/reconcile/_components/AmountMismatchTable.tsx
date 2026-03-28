// 金額差異テーブル（名義一致・金額不一致）
"use client";

import type { AmountMismatchItem, PendingOrder } from "./types";

interface AmountMismatchTableProps {
  items: AmountMismatchItem[];
  selectedMismatches: Set<number>;
  onSelectedMismatchesChange: (selected: Set<number>) => void;
  onChangeProduct: (order: PendingOrder) => void;
}

export default function AmountMismatchTable({
  items,
  selectedMismatches,
  onSelectedMismatchesChange,
  onChangeProduct,
}: AmountMismatchTableProps) {
  if (items.length === 0) return null;

  return (
    <div className="border-t border-orange-200">
      <div className="px-6 py-4 bg-orange-50">
        <h3 className="text-base font-semibold text-orange-900">
          金額不一致（{items.length}件）
        </h3>
        <p className="text-sm text-orange-700 mt-1">
          名義人は一致しますが金額が異なります。確認して反映対象に含める場合はチェックしてください
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                選択
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                振込日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                名義人
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                振込金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                注文金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                差額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                患者ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                期限
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {items.map((item, i) => {
              const hoursDiff = (() => {
                if (!item.order.created_at) return null;
                const t = new Date(item.transfer.date);
                const o = new Date(item.order.created_at);
                if (isNaN(t.getTime()) || isNaN(o.getTime())) return null;
                return Math.abs(t.getTime() - o.getTime()) / (1000 * 60 * 60);
              })();
              const isOverdue = hoursDiff !== null && hoursDiff > 72;

              return (
              <tr key={i} className={`hover:bg-orange-50 ${isOverdue ? "bg-red-50/50" : ""}`}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedMismatches.has(i)}
                    onChange={(e) => {
                      const next = new Set(selectedMismatches);
                      if (e.target.checked) {
                        next.add(i);
                      } else {
                        next.delete(i);
                      }
                      onSelectedMismatchesChange(next);
                    }}
                    className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {item.transfer.date}
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">
                  {item.transfer.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  ¥{item.transfer.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  ¥{item.order.amount.toLocaleString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                  item.difference > 0 ? "text-blue-600" : "text-red-600"
                }`}>
                  {item.difference > 0 ? "+" : ""}¥{item.difference.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                  <button onClick={() => window.open(`/admin/line/talk?pid=${item.order.patient_id}`, '_blank')} className="text-blue-600 hover:text-blue-900 hover:underline">
                    {item.order.patient_id}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {item.order.created_at ? (
                    isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        ⚠ {Math.round(hoursDiff!)}h超過
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        OK
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => {
                      // PendingOrder形式に変換して商品変更モーダルを開く
                      onChangeProduct({
                        id: item.order.id,
                        patient_id: item.order.patient_id,
                        patient_name: "",
                        product_code: item.order.product_code,
                        product_name: item.order.product_name || item.order.product_code,
                        amount: item.order.amount,
                        shipping_name: "",
                        account_name: item.transfer.description,
                        address: "",
                        postal_code: "",
                        phone: "",
                        created_at: "",
                        status: "pending_confirmation",
                      });
                    }}
                    className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-xs"
                  >
                    商品変更
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
