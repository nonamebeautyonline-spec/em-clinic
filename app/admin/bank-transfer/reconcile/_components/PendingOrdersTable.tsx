// 配送先情報フォーム（銀行振込注文一覧）
"use client";

import type { PendingOrder } from "./types";

interface PendingOrdersTableProps {
  orders: PendingOrder[];
  loading: boolean;
  filter: "pending_confirmation" | "confirmed" | "all";
  onFilterChange: (filter: "pending_confirmation" | "confirmed" | "all") => void;
  onRefresh: () => void;
  onManualConfirm: (order: PendingOrder) => void;
  onChangeProduct: (order: PendingOrder) => void;
}

export default function PendingOrdersTable({
  orders,
  loading,
  filter,
  onFilterChange,
  onRefresh,
  onManualConfirm,
  onChangeProduct,
}: PendingOrdersTableProps) {
  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">配送先情報フォーム</h2>
            <p className="text-sm text-slate-600 mt-1">銀行振込注文（{orders.length}件）</p>
          </div>
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            更新
          </button>
        </div>
        <div className="flex gap-4 mt-3">
          {([
            { value: "pending_confirmation" as const, label: "未照合" },
            { value: "confirmed" as const, label: "照合済み" },
            { value: "all" as const, label: "全て" },
          ]).map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="pendingFilter"
                checked={filter === opt.value}
                onChange={() => onFilterChange(opt.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-slate-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">読み込み中...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">該当する注文はありません</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">申請日時</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">患者ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">氏名（振込名義）</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">商品名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">金額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">送付先</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {new Date(order.created_at).toLocaleString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    <button onClick={() => window.open(`/admin/line/talk?pid=${order.patient_id}`, '_blank')} className="text-blue-600 hover:text-blue-900 hover:underline">
                      {order.patient_id}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {order.patient_name || "-"}
                    {order.account_name && (
                      <span className={/[\u30A0-\u30FF]/.test(order.account_name) ? "text-slate-500" : "text-red-500 font-medium"}>
                        （{order.account_name}）
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {order.product_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    ¥{order.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    〒{order.postal_code} {order.address}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {order.status === "pending_confirmation" ? (
                      <>
                        <button
                          onClick={() => onChangeProduct(order)}
                          className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-xs"
                        >
                          商品変更
                        </button>
                        <button
                          onClick={() => onManualConfirm(order)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                        >
                          手動確認
                        </button>
                      </>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        確認済み
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
