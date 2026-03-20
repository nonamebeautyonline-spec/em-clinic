// 分割マッチ結果テーブル（複数振込の合算一致）
"use client";

import type { SplitMatchedGroup } from "./types";

interface SplitMatchedTableProps {
  items: SplitMatchedGroup[];
  selectedSplits: Set<number>;
  onSelectedSplitsChange: (selected: Set<number>) => void;
}

export default function SplitMatchedTable({
  items,
  selectedSplits,
  onSelectedSplitsChange,
}: SplitMatchedTableProps) {
  if (items.length === 0) return null;

  return (
    <div className="border-t border-purple-200">
      <div className="px-6 py-4 bg-purple-50">
        <h3 className="text-base font-semibold text-purple-900">
          分割振込（{items.length}件）
        </h3>
        <p className="text-sm text-purple-700 mt-1">
          複数回の振込を合算すると注文金額と一致します。確認して反映する場合はチェックしてください
        </p>
      </div>
      <div className="divide-y divide-slate-200">
        {items.map((group, gi) => (
          <div key={gi} className="px-6 py-4 hover:bg-purple-50">
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={selectedSplits.has(gi)}
                onChange={(e) => {
                  const next = new Set(selectedSplits);
                  if (e.target.checked) {
                    next.add(gi);
                  } else {
                    next.delete(gi);
                  }
                  onSelectedSplitsChange(next);
                }}
                className="w-4 h-4 mt-1 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-slate-900">
                    注文金額: ¥{group.order.amount.toLocaleString()}
                  </span>
                  <span className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    合算一致
                  </span>
                  <button
                    onClick={() => window.open(`/admin/line/talk?pid=${group.order.patient_id}`, '_blank')}
                    className="text-xs text-blue-600 hover:underline font-mono"
                  >
                    {group.order.patient_id}
                  </button>
                </div>
                <div className="space-y-1">
                  {group.transfers.map((t, ti) => (
                    <div key={ti} className="flex items-center gap-4 text-sm">
                      <span className="text-slate-500 w-24">{t.date}</span>
                      <span className="text-slate-700 flex-1">{t.description}</span>
                      <span className="font-medium text-green-700">¥{t.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 text-sm pt-1 border-t border-slate-100">
                    <span className="text-slate-500 w-24">合計</span>
                    <span className="flex-1" />
                    <span className="font-bold text-purple-700">
                      ¥{group.totalAmount.toLocaleString()}
                      {group.totalAmount === group.order.amount && " = 注文金額"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
