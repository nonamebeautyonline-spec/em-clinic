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
  payment_date_label?: string; // "（申請日時）" or ""
  shipping_date: string;
  tracking_number: string;
  purchase_count: number;
  status?: string;
}

export default function NonameMasterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [limit] = useState(500);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingTracking, setEditingTracking] = useState<Record<string, string>>({});
  const [savingTracking, setSavingTracking] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    loadOrders(token);
  }, [router, page]);

  const loadOrders = async (token: string) => {
    setLoading(true);
    setError("");

    try {
      const offset = (page - 1) * limit;
      const res = await fetch(`/api/admin/noname-master?limit=${limit}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`データ取得失敗 (${res.status})`);
      }

      const data = await res.json();
      setOrders(data.orders || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error("Orders fetch error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleTrackingChange = (orderId: string, value: string) => {
    setEditingTracking((prev) => ({ ...prev, [orderId]: value }));
  };

  const handleTrackingSave = async (orderId: string) => {
    const trackingNumber = editingTracking[orderId];
    if (!trackingNumber || trackingNumber.trim() === "") return;

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setSavingTracking((prev) => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch("/api/admin/noname-master/update-tracking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          tracking_number: trackingNumber.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失敗");
      }

      const data = await res.json();
      // 成功したらordersを更新
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, tracking_number: data.order.tracking_number, shipping_date: data.order.shipping_date }
            : o
        )
      );
      // 入力状態をクリア
      setEditingTracking((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } catch (err) {
      console.error("Tracking update error:", err);
      alert(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSavingTracking((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

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

  const normalizeTrackingNumber = (trackingNumber: string) => {
    return String(trackingNumber ?? "").replace(/[^\d]/g, "");
  };

  const buildTrackingUrl = (trackingNumber: string) => {
    const normalized = normalizeTrackingNumber(trackingNumber);
    return `https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=${encodeURIComponent(normalized)}`;
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
        <h1 className="text-2xl font-bold text-slate-900">決済マスター</h1>
        <p className="text-slate-600 text-sm mt-1">全ての決済注文データ（クレカ・銀行振込統合）</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            全 {totalCount} 件中 {(page - 1) * limit + 1}〜{Math.min(page * limit, totalCount)} 件表示
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
          >
            ← 前へ
          </button>
          <span className="text-sm text-slate-600">
            {page} / {totalPages || 1} ページ
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
          >
            次へ →
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
                  氏名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  患者ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  商品名
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    注文データがありません
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatDateTime(order.payment_date)}
                      {order.payment_date_label && <span className="text-slate-500 ml-1">{order.payment_date_label}</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            order.payment_method === "クレジットカード"
                              ? "bg-yellow-300 text-black"
                              : "bg-cyan-300 text-black"
                          }`}
                        >
                          {order.payment_method}
                        </span>
                        {order.payment_date_label && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-200 text-slate-700">
                            {order.payment_date_label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {order.patient_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/admin/patients/${order.patient_id}`)}
                        className="text-blue-600 hover:text-blue-900 hover:underline font-mono"
                      >
                        {order.patient_id}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {order.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {formatDateOnly(order.shipping_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                      {order.tracking_number ? (
                        <a
                          href={buildTrackingUrl(order.tracking_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 hover:underline"
                        >
                          {order.tracking_number}
                        </a>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="追跡番号"
                            value={editingTracking[order.id] || ""}
                            onChange={(e) => handleTrackingChange(order.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleTrackingSave(order.id);
                            }}
                            className="w-32 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <button
                            onClick={() => handleTrackingSave(order.id)}
                            disabled={!editingTracking[order.id] || savingTracking[order.id]}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {savingTracking[order.id] ? "..." : "保存"}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold">
                        {order.purchase_count}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
