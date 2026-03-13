"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

interface BankTransferOrder {
  id: number;
  patient_id: string;
  payment_method: string;
  product_code?: string;
  shipping_name?: string;
  address?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  account_name?: string;
  shipping_date?: string;
  tracking_number?: string;
  created_at: string;
  status?: string;
  amount?: number;
  refund_status?: string;
}

export default function BankTransferManagementPage() {
  const swrKey = "/api/admin/bank-transfer-orders";
  const { data: swrData, isLoading: loading, error: swrError } = useSWR(swrKey);
  const orders: BankTransferOrder[] = swrData?.orders || [];
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  // キャンセルモーダル
  const [cancelTarget, setCancelTarget] = useState<BankTransferOrder | null>(null);
  const [cancelAction, setCancelAction] = useState<"cancel" | "refund">("cancel");
  const [cancelMemo, setCancelMemo] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const handleDeleteTestData = async () => {
    if (!confirm("テストデータを削除しますか？")) return;

    setError("");

    try {
      const res = await fetch("/api/admin/bank-transfer/delete-test-data", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("削除失敗");
      }

      const data = await res.json();
      alert(`${data.deletedCount}件のテストデータを削除しました`);
      mutate(swrKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  const handleBackfillToGAS = async () => {
    if (!confirm("全てのデータをGASシートにバックフィルしますか？")) return;

    setError("");

    try {
      const res = await fetch("/api/admin/bank-transfer/backfill-to-gas", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("バックフィル失敗");
      }

      const data = await res.json();
      alert(`${data.successCount}件をGASシートに同期しました`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  const openGASSheet = () => {
    const sheetId = "1WL8zQ1PQDzLyLvl_w5StVvZU4T8nfbPGI5rxQvW5Vq0";
    window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, "_blank");
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setError("");

    try {
      const res = await fetch("/api/admin/bank-transfer/cancel", {
        method: "POST",
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

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "cancelled") return order.status === "cancelled";
    if (filter === "pending_confirmation") return order.status !== "cancelled" && !order.address;
    if (filter === "confirmed") return order.status !== "cancelled" && !!order.address;
    return true;
  });

  const getStatusBadge = (order: BankTransferOrder) => {
    if (order.status === "cancelled") {
      if (order.refund_status === "PENDING") {
        return <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">返金待ち</span>;
      }
      return <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">キャンセル</span>;
    }
    if (order.address) {
      return <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">住所あり</span>;
    }
    return <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">住所なし</span>;
  };

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">銀行振込管理</h1>
          <p className="text-slate-600 text-sm mt-1">住所入力・照合・転記</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openGASSheet}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
          >
            GASシートを開く
          </button>
          <button
            onClick={handleBackfillToGAS}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:bg-slate-400"
          >
            GASにバックフィル
          </button>
          <button
            onClick={handleDeleteTestData}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold disabled:bg-slate-400"
          >
            テストデータ削除
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* フィルター */}
      <div className="mb-6 flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-700">フィルター:</span>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              filter === "all" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-300"
            }`}
          >
            全て ({orders.length})
          </button>
          <button
            onClick={() => setFilter("pending_confirmation")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              filter === "pending_confirmation"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-700 border border-slate-300"
            }`}
          >
            住所未入力 ({orders.filter((o) => o.status !== "cancelled" && !o.address).length})
          </button>
          <button
            onClick={() => setFilter("confirmed")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              filter === "confirmed"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-700 border border-slate-300"
            }`}
          >
            住所入力済み ({orders.filter((o) => o.status !== "cancelled" && !!o.address).length})
          </button>
          <button
            onClick={() => setFilter("cancelled")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              filter === "cancelled"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-700 border border-slate-300"
            }`}
          >
            キャンセル済み ({orders.filter((o) => o.status === "cancelled").length})
          </button>
        </div>

        {/* データテーブル */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">読み込み中...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">患者ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">患者氏名</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">商品</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">金額</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">住所</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">発送日</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">ステータス</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">注文日時</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        データがありません
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className={`border-b border-slate-100 hover:bg-slate-50 ${order.status === "cancelled" ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => window.open(`/admin/line/talk?pid=${order.patient_id}`, '_blank')}
                            className="text-blue-600 hover:text-blue-900 hover:underline font-mono"
                          >
                            {order.patient_id}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">{order.shipping_name || order.account_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{order.product_code || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {order.amount != null ? `¥${order.amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                          {order.address ? (
                            <span title={order.address}>{order.address}</span>
                          ) : (
                            <span className="text-red-600 font-semibold">未入力</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{order.shipping_date || '-'}</td>
                        <td className="px-4 py-3">
                          {getStatusBadge(order)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(order.created_at).toLocaleString("ja-JP")}
                        </td>
                        <td className="px-4 py-3">
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
        )}

      {/* GAS操作ガイド */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-blue-900 mb-4">GASシート操作ガイド</h2>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <strong>1. 自動照合（住所情報 × 入金CSV）</strong>
            <p className="ml-4 text-blue-700">
              メニューから実行。口座名義で自動的にマッチングし、照合済みシートに転記します。
            </p>
          </div>
          <div>
            <strong>2. 選択行を照合済みにコピー</strong>
            <p className="ml-4 text-blue-700">
              住所情報シートで行を選択してメニューから実行。手動で照合済みに移動します。
            </p>
          </div>
          <div>
            <strong>3. 選択行をのなめマスターに転記</strong>
            <p className="ml-4 text-blue-700">
              照合済みシートで行を選択してメニューから実行。のなめマスター「銀行振込」シートに転記し、ordersテーブルにも保存します。
            </p>
          </div>
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
                  <span className="text-slate-900">
                    {cancelTarget.shipping_name || cancelTarget.account_name || "-"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">商品:</span>
                  <span className="text-slate-900">{cancelTarget.product_code || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">金額:</span>
                  <span className="font-medium text-slate-900">
                    {cancelTarget.amount != null ? `¥${cancelTarget.amount.toLocaleString()}` : "-"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">注文日時:</span>
                  <span className="text-slate-900">
                    {new Date(cancelTarget.created_at).toLocaleString("ja-JP")}
                  </span>
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
