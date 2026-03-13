"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

interface BankTransferOrder {
  id: string;
  patient_id: string;
  patient_name: string;
  product_code: string;
  product_name: string;
  payment_date: string;
  payment_date_label: string;
  shipping_date: string;
  tracking_number: string;
  purchase_count: number;
  status: string;
  amount?: number;
  refund_status?: string;
}

export default function NonameMasterBankTransferPage() {
  const [limit, setLimit] = useState(100);

  const swrKey = `/api/admin/noname-master/bank-transfer?limit=${limit}`;
  const { data: ordersData, isLoading: loading, error: swrError } = useSWR<{ orders?: BankTransferOrder[] }>(swrKey);
  const orders = ordersData?.orders || [];
  const [error, setError] = useState("");

  // キャンセルモーダル
  const [cancelTarget, setCancelTarget] = useState<BankTransferOrder | null>(null);
  const [cancelAction, setCancelAction] = useState<"cancel" | "refund">("cancel");
  const [cancelMemo, setCancelMemo] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // SWRエラーをerror stateに反映
  const displayError = swrError ? (swrError instanceof Error ? swrError.message : "エラーが発生しました") : error;

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setError("");

    try {
      const res = await fetch("/api/admin/bank-transfer/cancel", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: String(cancelTarget.id),
          action: cancelAction,
          memo: cancelMemo || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data.message || data.error) || "処理失敗");
      }

      setCancelTarget(null);
      setCancelAction("cancel");
      setCancelMemo("");
      mutate(swrKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setCancelling(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (dateStr: string) => {
    if (!dateStr) return "-";
    return dateStr;
  };

  const getStatusBadge = (order: BankTransferOrder) => {
    if (order.status === "cancelled") {
      if (order.refund_status === "PENDING") {
        return <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">返金待ち</span>;
      }
      return <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">キャンセル</span>;
    }

    const styles: Record<string, string> = {
      pending_confirmation: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
    };
    const labels: Record<string, string> = {
      pending_confirmation: "確認待ち",
      confirmed: "確認済み",
    };

    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${styles[order.status] || "bg-slate-100 text-slate-700"}`}>
        {labels[order.status] || order.status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">銀行振込</h1>
        <p className="text-slate-600 text-sm mt-1">銀行振込決済の注文一覧</p>
      </div>

      {displayError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{displayError}</div>
      )}

      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm font-medium text-slate-700">表示件数:</label>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value={50}>50件</option>
          <option value={100}>100件</option>
          <option value={200}>200件</option>
          <option value={500}>500件</option>
        </select>
        <span className="text-sm text-slate-600">合計 {orders.length} 件</span>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  決済日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  氏名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  患者ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  商品名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  発送日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  追跡番号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  購入回数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    注文データがありません
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className={`hover:bg-slate-50 ${order.status === "cancelled" ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatDateTime(order.payment_date)}
                      {order.payment_date_label && <span className="text-slate-500 ml-1">{order.payment_date_label}</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {order.patient_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => window.open(`/admin/line/talk?pid=${order.patient_id}`, '_blank')}
                        className="text-blue-600 hover:text-blue-900 hover:underline font-mono"
                      >
                        {order.patient_id}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {order.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(order)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {formatDateOnly(order.shipping_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">
                      {order.tracking_number || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold">
                        {order.purchase_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.status !== "cancelled" && (
                        <button
                          onClick={() => {
                            setCancelTarget(order);
                            setCancelAction("cancel");
                            setCancelMemo("");
                          }}
                          className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                        >
                          キャンセル
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* キャンセル確認モーダル */}
      {cancelTarget && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => !cancelling && setCancelTarget(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">注文のキャンセル・返金</h3>
              <p className="text-sm text-slate-600 mt-1">
                この注文をキャンセルまたは返金処理します
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* 注文情報 */}
              <div className="bg-slate-50 rounded p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">患者ID:</span>
                  <span className="font-mono text-slate-900">{cancelTarget.patient_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">氏名:</span>
                  <span className="text-slate-900">{cancelTarget.patient_name || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">商品:</span>
                  <span className="text-slate-900">{cancelTarget.product_name}</span>
                </div>
                {cancelTarget.amount != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">金額:</span>
                    <span className="font-medium text-slate-900">¥{cancelTarget.amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">決済日時:</span>
                  <span className="text-slate-900">{formatDateTime(cancelTarget.payment_date)}</span>
                </div>
              </div>

              {/* アクション選択 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">処理内容</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="cancelAction"
                      value="cancel"
                      checked={cancelAction === "cancel"}
                      onChange={() => setCancelAction("cancel")}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900">キャンセル（返金不要）</div>
                      <div className="text-xs text-slate-500">誤って2回入力した等、振込されていない場合</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="cancelAction"
                      value="refund"
                      checked={cancelAction === "refund"}
                      onChange={() => setCancelAction("refund")}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900">返金（振込済み）</div>
                      <div className="text-xs text-slate-500">実際に振込があり、返金対応が必要な場合</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* メモ */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">メモ（任意）</label>
                <input
                  type="text"
                  value={cancelMemo}
                  onChange={(e) => setCancelMemo(e.target.value)}
                  placeholder="例: 重複入力のため"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* 注意書き */}
              <div className={`border rounded p-3 ${
                cancelAction === "refund"
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}>
                <p className={`text-sm ${
                  cancelAction === "refund" ? "text-red-800" : "text-yellow-800"
                }`}>
                  <strong>注意:</strong>{" "}
                  {cancelAction === "refund"
                    ? "この操作を実行すると、注文がキャンセルされ「返金待ち」として記録されます。返金一覧・決済マスターに反映されます。"
                    : "この操作を実行すると、注文が取り消されます。返金処理は行われません。"}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setCancelTarget(null);
                  setCancelMemo("");
                }}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                disabled={cancelling}
              >
                閉じる
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${
                  cancelling
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {cancelling ? "処理中..." : cancelAction === "refund" ? "返金処理を実行" : "キャンセルを実行"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
