"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  patient_id: string;
  patient_name: string;
  product_code: string;
  product_name: string;
  payment_method: string;
  payment_date: string;
  amount: number;
  status: string; // ★ ステータス（confirmed / pending_confirmation）
  postal_code: string;
  address: string;
  phone: string;
  email: string;
  purchase_count: number;
  tracking_number: string;
  shipping_list_created_at: string | null;
}

interface MergeableGroup {
  patient_id: string;
  patient_name: string;
  count: number;
  orders: Order[];
}

export default function ShippingPendingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mergeableGroups, setMergeableGroups] = useState<MergeableGroup[]>([]);
  const [error, setError] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [editCreatedMode, setEditCreatedMode] = useState(false);

  // 今日の日付（発送日）
  const today = new Date();
  const shippingDate = today.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/shipping/pending", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`データ取得失敗 (${res.status})`);
      }

      const data = await res.json();
      const fetchedOrders = data.orders || [];
      setOrders(fetchedOrders);
      setMergeableGroups(data.mergeableGroups || []);
    } catch (err) {
      console.error("Orders fetch error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
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

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleAllOrders = () => {
    // ★ pending_confirmation以外の注文を対象にする（editCreatedModeならラベル作成済みも含む）
    const selectableOrders = orders.filter((o) => o.status !== "pending_confirmation" && (editCreatedMode || !o.shipping_list_created_at));
    const selectableIds = selectableOrders.map((o) => o.id);

    // 選択可能な注文が全て選択されているか確認
    const allSelectableSelected = selectableIds.every((id) => selectedOrderIds.has(id));

    if (allSelectableSelected && selectedOrderIds.size > 0) {
      // 全選択 → 全解除
      setSelectedOrderIds(new Set());
    } else {
      // 一部選択または全解除 → 全選択（pending_confirmation以外）
      setSelectedOrderIds(new Set(selectableIds));
    }
  };

  const selectedOrders = orders.filter((o) => selectedOrderIds.has(o.id));

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
        <h1 className="text-2xl font-bold text-slate-900">{shippingDate} 発送予定</h1>
        <p className="text-slate-600 text-sm mt-1">
          未発送・未返金の注文一覧
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {mergeableGroups.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">
            ⚠️ まとめ配送候補（同一患者の複数注文）
          </h3>
          <ul className="space-y-1 text-sm text-yellow-800">
            {mergeableGroups.map((group) => (
              <li key={group.patient_id}>
                {group.patient_name} ({group.patient_id}) - {group.count}件の注文
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <span className="text-sm text-slate-600">
            合計 {orders.length} 件（確認済み {orders.filter(o => o.status === "confirmed" && !o.shipping_list_created_at).length} 件 / ラベル作成済み {orders.filter(o => !!o.shipping_list_created_at).length} 件 / 振込確認待ち {orders.filter(o => o.status === "pending_confirmation").length} 件）
          </span>
          <span className="hidden md:inline text-sm font-semibold text-blue-600">
            選択中: {selectedOrderIds.size} 件
          </span>
          <button
            onClick={toggleAllOrders}
            className="hidden md:inline text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {selectedOrderIds.size === orders.length ? "全解除" : "全選択"}
          </button>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => {
                if (selectedOrderIds.size === 0) {
                  alert("発送する注文を選択してください");
                  return;
                }
                // 選択された注文IDをクエリパラメータで渡す
                const ids = Array.from(selectedOrderIds).join(",");
                router.push(`/admin/shipping/create-list?ids=${encodeURIComponent(ids)}`);
              }}
              disabled={selectedOrderIds.size === 0}
              className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              📋 発送リストを作る ({selectedOrderIds.size}件)
            </button>
            <button
              onClick={() => {
                setEditCreatedMode((prev) => !prev);
                setSelectedOrderIds(new Set());
              }}
              className={`text-xs px-2 py-1 rounded ${
                editCreatedMode
                  ? "text-orange-700 bg-orange-100 hover:bg-orange-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {editCreatedMode ? "✏️ 作成済み編集モード ON" : "作成済みリストを編集"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="hidden md:table-cell px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={
                      orders.filter((o) => o.status !== "pending_confirmation" && (editCreatedMode || !o.shipping_list_created_at)).length > 0 &&
                      orders.filter((o) => o.status !== "pending_confirmation" && (editCreatedMode || !o.shipping_list_created_at)).every((o) => selectedOrderIds.has(o.id))
                    }
                    onChange={toggleAllOrders}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  決済日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  決済方法
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  患者名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  患者ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  商品名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  郵便番号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  住所
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  電話番号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  購入回数
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {(() => {
                // editCreatedMode: 作成済みのみ表示 / 通常: 作成済み以外を表示
                const filteredOrders = editCreatedMode
                  ? orders.filter((o) => !!o.shipping_list_created_at)
                  : orders;
                return filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-500">
                    {editCreatedMode ? "作成済みの注文はありません" : "発送待ちの注文はありません"}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isPending = order.status === "pending_confirmation";
                  const isLabelCreated = !!order.shipping_list_created_at;
                  const isDisabled = editCreatedMode ? false : (isPending || isLabelCreated);
                  return (
                    <tr
                      key={order.id}
                      className={`${
                        isDisabled
                          ? "bg-slate-100 text-slate-400"
                          : mergeableGroups.some((g) => g.patient_id === order.patient_id)
                          ? "bg-yellow-50 hover:bg-yellow-100"
                          : "hover:bg-slate-50"
                      }`}
                    >
                    <td className="hidden md:table-cell px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        disabled={isDisabled}
                        className={`w-4 h-4 text-blue-600 rounded focus:ring-blue-500 ${
                          isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                        }`}
                      />
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDisabled ? "text-slate-400" : "text-slate-900"}`}>
                      {formatDate(order.payment_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            order.payment_method === "クレジットカード"
                              ? "bg-yellow-300 text-black"
                              : "bg-cyan-300 text-black"
                          } ${isDisabled ? "opacity-50" : ""}`}
                        >
                          {order.payment_method}
                        </span>
                        {isPending && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-300 text-slate-600">
                            振込確認待ち
                          </span>
                        )}
                        {isLabelCreated && !isPending && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-200 text-green-700">
                            ラベル作成済み
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDisabled ? "text-slate-400" : "text-slate-900"}`}>
                      {order.patient_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => window.open(`/admin/line/talk?pid=${order.patient_id}`, '_blank')}
                        className={`font-mono ${
                          isDisabled
                            ? "text-slate-400 cursor-default"
                            : "text-blue-600 hover:text-blue-900 hover:underline"
                        }`}
                        disabled={isDisabled}
                      >
                        {order.patient_id}
                      </button>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDisabled ? "text-slate-400" : "text-slate-900"}`}>
                      {order.product_name}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDisabled ? "text-slate-400" : "text-slate-600"}`}>
                      {order.postal_code || "-"}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDisabled ? "text-slate-400" : "text-slate-600"} max-w-xs truncate`}>
                      {order.address || "-"}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDisabled ? "text-slate-400" : "text-slate-600"}`}>
                      {order.phone || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${isDisabled ? "bg-slate-200 text-slate-400" : "bg-slate-100 text-slate-700"} font-semibold`}>
                        {order.purchase_count}
                      </span>
                    </td>
                  </tr>
                  );
                })
              );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
