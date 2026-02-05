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
  is_overdue?: boolean; // 発送漏れフラグ
  refund_status?: string | null;
  refunded_at?: string | null;
  refunded_amount?: number | null;
}

export default function NonameMasterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(100);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingTracking, setEditingTracking] = useState<Record<string, string>>({});
  const [savingTracking, setSavingTracking] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "unshipped" | "shipped" | "overdue">("all");
  const [addingToShipping, setAddingToShipping] = useState<Record<string, boolean>>({});
  const [showEditMenu, setShowEditMenu] = useState<string | null>(null);
  const [editingTrackingFor, setEditingTrackingFor] = useState<string | null>(null);
  const [newTrackingNumber, setNewTrackingNumber] = useState("");
  const [processingEdit, setProcessingEdit] = useState<Record<string, boolean>>({});

  // 発送済みで情報入力用の状態
  const [shippedInfoFor, setShippedInfoFor] = useState<string | null>(null);
  const [shippedDate, setShippedDate] = useState("");
  const [shippedTracking, setShippedTracking] = useState("");
  const [savingShippedInfo, setSavingShippedInfo] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    loadOrders(token);
  }, [router, page, filter, limit]);

  const loadOrders = async (token: string) => {
    setLoading(true);
    setError("");

    try {
      const offset = (page - 1) * limit;
      const res = await fetch(`/api/admin/noname-master?limit=${limit}&offset=${offset}&filter=${filter}`, {
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

  const handleAddToShipping = async (orderId: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setAddingToShipping((prev) => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch("/api/admin/noname-master/add-to-shipping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "追加失敗");
      }

      // 成功したらordersを更新（発送漏れフラグを解除）
      // shipping_dateはNULLのまま、発送リストには追加された
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, is_overdue: false }
            : o
        )
      );
      alert("発送リストに追加しました");
    } catch (err) {
      console.error("Add to shipping error:", err);
      alert(err instanceof Error ? err.message : "追加に失敗しました");
    } finally {
      setAddingToShipping((prev) => ({ ...prev, [orderId]: false }));
    }
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

  // 追跡番号変更
  const handleChangeTracking = async (orderId: string) => {
    if (!newTrackingNumber.trim()) {
      alert("追跡番号を入力してください");
      return;
    }
    if (!confirm(`追跡番号を「${newTrackingNumber.trim()}」に変更しますか？`)) return;

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setProcessingEdit((prev) => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch("/api/admin/noname-master/update-tracking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          tracking_number: newTrackingNumber.trim(),
          update_only: true, // 追跡番号のみ更新
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失敗");
      }

      const data = await res.json();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, tracking_number: data.order.tracking_number }
            : o
        )
      );
      setEditingTrackingFor(null);
      setNewTrackingNumber("");
      setShowEditMenu(null);
      alert("追跡番号を変更しました");
    } catch (err) {
      console.error("Change tracking error:", err);
      alert(err instanceof Error ? err.message : "変更に失敗しました");
    } finally {
      setProcessingEdit((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // 発送済みで情報入力を保存
  const handleSaveShippedInfo = async (orderId: string) => {
    if (!shippedDate || !shippedTracking.trim()) {
      alert("発送日と追跡番号を入力してください");
      return;
    }

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setSavingShippedInfo(true);

    try {
      const res = await fetch("/api/admin/noname-master/update-tracking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          tracking_number: shippedTracking.trim(),
          shipping_date: shippedDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失敗");
      }

      const data = await res.json();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, tracking_number: data.order.tracking_number, shipping_date: data.order.shipping_date, is_overdue: false }
            : o
        )
      );
      setShippedInfoFor(null);
      setShippedDate("");
      setShippedTracking("");
      alert("発送情報を保存しました");
    } catch (err) {
      console.error("Save shipped info error:", err);
      alert(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSavingShippedInfo(false);
    }
  };

  // ラベル作り直し（shipping info, tracking numberをnullにして発送リストに追加）
  const handleRecreateLabel = async (orderId: string) => {
    if (!confirm("ラベルを作り直しますか？\n\n・追跡番号がクリアされます\n・発送情報がリセットされます\n・本日の発送リストに追加されます")) return;

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setProcessingEdit((prev) => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch("/api/admin/noname-master/recreate-label", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失敗");
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, tracking_number: "", shipping_date: "" }
            : o
        )
      );
      setShowEditMenu(null);
      alert("ラベル作り直しの準備が完了しました。発送リストに追加されました。");
    } catch (err) {
      console.error("Recreate label error:", err);
      alert(err instanceof Error ? err.message : "処理に失敗しました");
    } finally {
      setProcessingEdit((prev) => ({ ...prev, [orderId]: false }));
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

      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => { setFilter("all"); setPage(1); }}
              className={`px-3 py-1 text-sm rounded ${filter === "all" ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
            >
              全て
            </button>
            <button
              onClick={() => { setFilter("unshipped"); setPage(1); }}
              className={`px-3 py-1 text-sm rounded ${filter === "unshipped" ? "bg-orange-500 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              未発送
            </button>
            <button
              onClick={() => { setFilter("overdue"); setPage(1); }}
              className={`px-3 py-1 text-sm rounded ${filter === "overdue" ? "bg-red-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              発送漏れ
            </button>
            <button
              onClick={() => { setFilter("shipped"); setPage(1); }}
              className={`px-3 py-1 text-sm rounded ${filter === "shipped" ? "bg-green-500 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              発送済
            </button>
          </div>
          <span className="text-sm text-slate-600">
            {totalCount} 件
            {filter === "unshipped" && "（未発送）"}
            {filter === "shipped" && "（発送済）"}
            {filter === "overdue" && "（発送漏れ）"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">表示件数:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1 text-sm border border-slate-300 rounded bg-white"
            >
              <option value={100}>100件</option>
              <option value={200}>200件</option>
              <option value={500}>500件</option>
            </select>
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
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  変更
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  購入回数
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
                  <tr key={order.id} className={`hover:bg-slate-50 ${order.is_overdue ? "bg-red-50 border-l-4 border-l-red-500" : ""}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="flex items-center gap-2">
                        {order.is_overdue && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-600 text-white">
                            漏れ
                          </span>
                        )}
                        <span>{formatDateTime(order.payment_date)}</span>
                        {order.payment_date_label && <span className="text-slate-500">{order.payment_date_label}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {(order.refund_status === "refunded" || order.refund_status === "COMPLETED") && (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-600 text-white">
                            返金済
                          </span>
                        )}
                        {(order.refund_status === "partial" || order.refund_status === "PARTIAL") && (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-orange-500 text-white">
                            一部返金
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
                      {order.shipping_date ? (
                        formatDateOnly(order.shipping_date)
                      ) : shippedInfoFor === order.id ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="date"
                            value={shippedDate}
                            onChange={(e) => setShippedDate(e.target.value)}
                            className="w-32 px-2 py-1 text-xs border border-slate-300 rounded"
                          />
                          <input
                            type="text"
                            placeholder="追跡番号"
                            value={shippedTracking}
                            onChange={(e) => setShippedTracking(e.target.value)}
                            className="w-32 px-2 py-1 text-xs border border-slate-300 rounded"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSaveShippedInfo(order.id)}
                              disabled={savingShippedInfo}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {savingShippedInfo ? "..." : "保存"}
                            </button>
                            <button
                              onClick={() => {
                                setShippedInfoFor(null);
                                setShippedDate("");
                                setShippedTracking("");
                              }}
                              className="px-2 py-1 text-xs bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : order.is_overdue ? (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleAddToShipping(order.id)}
                            disabled={addingToShipping[order.id]}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {addingToShipping[order.id] ? "..." : "本日発送に追加"}
                          </button>
                          <button
                            onClick={() => {
                              setShippedInfoFor(order.id);
                              setShippedDate("");
                              setShippedTracking("");
                            }}
                            className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700"
                          >
                            発送済み入力
                          </button>
                        </div>
                      ) : filter === "unshipped" ? (
                        <button
                          onClick={() => {
                            setShippedInfoFor(order.id);
                            setShippedDate("");
                            setShippedTracking("");
                          }}
                          className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700"
                        >
                          発送済み入力
                        </button>
                      ) : (
                        "-"
                      )}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center relative">
                      {order.tracking_number ? (
                        <div className="relative inline-block">
                          <button
                            onClick={() => setShowEditMenu(showEditMenu === order.id ? null : order.id)}
                            disabled={processingEdit[order.id]}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {processingEdit[order.id] ? "..." : "変更"}
                          </button>
                          {showEditMenu === order.id && (
                            <div className="absolute z-10 mt-1 right-0 w-40 bg-white border border-slate-200 rounded-lg shadow-lg">
                              {editingTrackingFor === order.id ? (
                                <div className="p-2">
                                  <input
                                    type="text"
                                    placeholder="新しい追跡番号"
                                    value={newTrackingNumber}
                                    onChange={(e) => setNewTrackingNumber(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleChangeTracking(order.id);
                                      if (e.key === "Escape") {
                                        setEditingTrackingFor(null);
                                        setNewTrackingNumber("");
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded mb-2"
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleChangeTracking(order.id)}
                                      className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                      変更
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingTrackingFor(null);
                                        setNewTrackingNumber("");
                                      }}
                                      className="flex-1 px-2 py-1 text-xs bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                                    >
                                      戻る
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingTrackingFor(order.id);
                                      setNewTrackingNumber(order.tracking_number || "");
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 border-b border-slate-200"
                                  >
                                    追跡番号変更
                                  </button>
                                  <button
                                    onClick={() => handleRecreateLabel(order.id)}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                  >
                                    ラベル作り直し
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
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
