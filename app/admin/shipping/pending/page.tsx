"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  patient_id: string;
  patient_name: string;
  lstep_id: string;
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
  const [cutoffTime, setCutoffTime] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    loadOrders(token);
  }, [router]);

  const loadOrders = async (token: string) => {
    setLoading(true);
    setError("");

    try {
      // 前回締め切り時刻を計算（昨日の15時）
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(15, 0, 0, 0);

      setCutoffTime(yesterday.toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }));

      const res = await fetch("/api/admin/shipping/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`データ取得失敗 (${res.status})`);
      }

      const data = await res.json();
      setOrders(data.orders || []);
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
        <h1 className="text-2xl font-bold text-slate-900">発送待ちリスト</h1>
        <p className="text-slate-600 text-sm mt-1">
          未発送の注文一覧（クレカ・銀行振込統合）
        </p>
        {cutoffTime && (
          <p className="text-slate-500 text-xs mt-1">
            📅 表示範囲: {cutoffTime} 以降の注文
          </p>
        )}
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

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            合計 {orders.length} 件（確認済み {orders.filter(o => o.status === "confirmed").length} 件 / 振込確認待ち {orders.filter(o => o.status === "pending_confirmation").length} 件）
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/admin/shipping/create-list")}
            className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700"
          >
            📋 発送リストを作成
          </button>
        </div>
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
                  決済方法
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  患者名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  患者ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  LステップID
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
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-500">
                    発送待ちの注文はありません
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isPending = order.status === "pending_confirmation";
                  return (
                    <tr
                      key={order.id}
                      className={`${
                        isPending
                          ? "bg-slate-100 text-slate-400"
                          : mergeableGroups.some((g) => g.patient_id === order.patient_id)
                          ? "bg-yellow-50 hover:bg-yellow-100"
                          : "hover:bg-slate-50"
                      }`}
                    >
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isPending ? "text-slate-400" : "text-slate-900"}`}>
                      {formatDate(order.payment_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            order.payment_method === "クレジットカード"
                              ? "bg-yellow-300 text-black"
                              : "bg-cyan-300 text-black"
                          } ${isPending ? "opacity-50" : ""}`}
                        >
                          {order.payment_method}
                        </span>
                        {isPending && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-300 text-slate-600">
                            振込確認待ち
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isPending ? "text-slate-400" : "text-slate-900"}`}>
                      {order.patient_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/admin/patients/${order.patient_id}`)}
                        className={`font-mono ${
                          isPending
                            ? "text-slate-400 cursor-default"
                            : "text-blue-600 hover:text-blue-900 hover:underline"
                        }`}
                        disabled={isPending}
                      >
                        {order.patient_id}
                      </button>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${isPending ? "text-slate-400" : "text-slate-600"}`}>
                      {order.lstep_id || "-"}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isPending ? "text-slate-400" : "text-slate-900"}`}>
                      {order.product_name}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isPending ? "text-slate-400" : "text-slate-600"}`}>
                      {order.postal_code || "-"}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isPending ? "text-slate-400" : "text-slate-600"} max-w-xs truncate`}>
                      {order.address || "-"}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isPending ? "text-slate-400" : "text-slate-600"}`}>
                      {order.phone || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${isPending ? "bg-slate-200 text-slate-400" : "bg-slate-100 text-slate-700"} font-semibold`}>
                        {order.purchase_count}
                      </span>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
