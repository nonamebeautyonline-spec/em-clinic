"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

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
  const { data, error, isLoading: loading, isValidating } = useSWR<{ orders: Order[]; mergeableGroups: MergeableGroup[] }>("/api/admin/shipping/pending");
  const orders = data?.orders || [];
  const mergeableGroups = data?.mergeableGroups || [];
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [editCreatedMode, setEditCreatedMode] = useState(false);

  // 過去発送履歴
  type HistoryRange = "week" | "month" | "custom";
  const [historyRange, setHistoryRange] = useState<HistoryRange>("week");
  const [historyCustomFrom, setHistoryCustomFrom] = useState("");
  const [historyCustomTo, setHistoryCustomTo] = useState("");
  const [historyDays, setHistoryDays] = useState<{ date: string; count: number; items: { patient_id: string; patient_name: string; tracking_number: string }[] }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyExpandedDate, setHistoryExpandedDate] = useState<string | null>(null);

  const loadHistory = async (range: HistoryRange, customFrom?: string, customTo?: string) => {
    setHistoryLoading(true);
    const today = new Date();
    let from: string;
    let to: string;
    if (range === "custom" && customFrom && customTo) {
      from = customFrom;
      to = customTo;
    } else if (range === "month") {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      from = d.toISOString().slice(0, 10);
      to = today.toISOString().slice(0, 10);
    } else {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      from = d.toISOString().slice(0, 10);
      to = today.toISOString().slice(0, 10);
    }
    try {
      const res = await fetch(`/api/admin/shipping/history?from=${from}&to=${to}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setHistoryDays(data.days || []);
      }
    } catch (e) {
      console.error("History load error:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory("week");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 今日の日付（発送日）
  const today = new Date();
  const shippingDate = today.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

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
    // ★ editCreatedMode: 作成済みのみ / 通常: pending_confirmationとラベル作成済み以外
    const selectableOrders = editCreatedMode
      ? orders.filter((o) => !!o.shipping_list_created_at)
      : orders.filter((o) => o.status !== "pending_confirmation" && !o.shipping_list_created_at);
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
          {error.message}
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

      <div className="bg-white rounded-lg shadow overflow-hidden relative">
        {/* キャッシュ表示中は操作不可オーバーレイ */}
        {isValidating && !loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              最新情報を取得中...
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="hidden md:table-cell px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={
                      (editCreatedMode
                        ? orders.filter((o) => !!o.shipping_list_created_at)
                        : orders.filter((o) => o.status !== "pending_confirmation" && !o.shipping_list_created_at)
                      ).length > 0 &&
                      (editCreatedMode
                        ? orders.filter((o) => !!o.shipping_list_created_at)
                        : orders.filter((o) => o.status !== "pending_confirmation" && !o.shipping_list_created_at)
                      ).every((o) => selectedOrderIds.has(o.id))
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

      {/* 過去発送履歴 */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">過去の発送履歴</h2>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {(["week", "month", "custom"] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setHistoryRange(r);
                if (r !== "custom") {
                  loadHistory(r);
                  setHistoryExpandedDate(null);
                }
              }}
              className={`px-3 py-1.5 text-sm rounded-lg ${historyRange === r ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {r === "week" ? "1週間" : r === "month" ? "1ヶ月" : "カスタム"}
            </button>
          ))}
          {historyRange === "custom" && (
            <>
              <input
                type="date"
                value={historyCustomFrom}
                onChange={(e) => setHistoryCustomFrom(e.target.value)}
                className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
              />
              <span className="text-slate-400">〜</span>
              <input
                type="date"
                value={historyCustomTo}
                onChange={(e) => setHistoryCustomTo(e.target.value)}
                className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
              />
              <button
                onClick={() => {
                  if (historyCustomFrom && historyCustomTo) {
                    loadHistory("custom", historyCustomFrom, historyCustomTo);
                    setHistoryExpandedDate(null);
                  }
                }}
                disabled={!historyCustomFrom || !historyCustomTo}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300"
              >
                検索
              </button>
            </>
          )}
        </div>

        {historyLoading ? (
          <div className="text-center py-8 text-slate-400">読み込み中...</div>
        ) : historyDays.length === 0 ? (
          <div className="text-center py-8 text-slate-400">発送データがありません</div>
        ) : (
          <div className="space-y-1">
            {historyDays.map((day) => (
              <div key={day.date}>
                <button
                  onClick={() => setHistoryExpandedDate(historyExpandedDate === day.date ? null : day.date)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-800">{day.date}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-600">{day.count}人</span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${historyExpandedDate === day.date ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                {historyExpandedDate === day.date && (
                  <div className="mx-4 mb-3 border border-slate-200 rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">PID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">氏名</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">追跡番号</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {day.items.map((item, i) => (
                          <tr key={`${item.patient_id}-${i}`} className="hover:bg-slate-50">
                            <td className="px-4 py-2">
                              <button
                                onClick={() => window.open(`/admin/line/talk?pid=${item.patient_id}`, '_blank')}
                                className="text-blue-600 hover:underline font-mono text-xs"
                              >
                                {item.patient_id}
                              </button>
                            </td>
                            <td className="px-4 py-2 text-slate-800">{item.patient_name || "-"}</td>
                            <td className="px-4 py-2 font-mono text-xs text-slate-600">{item.tracking_number || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
