"use client";

import { useState } from "react";
import useSWR from "swr";

interface Order {
  id: string;
  patient_id: string;
  patient_name: string;
  product_code: string;
  product_name: string;
  amount: number;
  postal_code: string;
  address: string;
  phone: string;
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
  const [limit, setLimit] = useState(100);
  const [page, setPage] = useState(1);
  const [editingTracking, setEditingTracking] = useState<Record<string, string>>({});
  const [savingTracking, setSavingTracking] = useState<Record<string, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState<"all" | "credit_card" | "bank_transfer">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unshipped" | "shipped" | "refund_cancel">("all");

  const offset = (page - 1) * limit;
  const ordersKey = `/api/admin/noname-master?limit=${limit}&offset=${offset}&payment_method=${paymentMethod}&status=${statusFilter}`;
  const { data: ordersData, error: ordersError, isLoading: loading, mutate: mutateOrders } = useSWR<{ orders: Order[]; total: number; refund_summary?: { count: number; totalAmount: number } | null }>(ordersKey);
  const orders = ordersData?.orders || [];
  const totalCount = ordersData?.total || 0;
  const error = ordersError ? (ordersError instanceof Error ? ordersError.message : "エラーが発生しました") : "";
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

  // 返金モーダル
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);
  const [refundStep, setRefundStep] = useState<"token" | "action" | "confirm">("token");
  const [refundToken, setRefundToken] = useState("");
  const [refundMemo, setRefundMemo] = useState("");
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [bankAction, setBankAction] = useState<"cancel" | "refund">("cancel");


  const handleTrackingChange = (orderId: string, value: string) => {
    setEditingTracking((prev) => ({ ...prev, [orderId]: value }));
  };

  const handleAddToShipping = async (orderId: string) => {
    setAddingToShipping((prev) => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch("/api/admin/noname-master/add-to-shipping", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data.message || data.error) || "追加失敗");
      }

      // 成功したらordersを再取得
      await mutateOrders();
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

    setSavingTracking((prev) => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch("/api/admin/noname-master/update-tracking", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          tracking_number: trackingNumber.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data.message || data.error) || "更新失敗");
      }

      // 成功したらordersを再取得
      await mutateOrders();
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

    setProcessingEdit((prev) => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch("/api/admin/noname-master/update-tracking", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          tracking_number: newTrackingNumber.trim(),
          update_only: true, // 追跡番号のみ更新
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data.message || data.error) || "更新失敗");
      }

      await mutateOrders();
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

    setSavingShippedInfo(true);

    try {
      const res = await fetch("/api/admin/noname-master/update-tracking", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          tracking_number: shippedTracking.trim(),
          shipping_date: shippedDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data.message || data.error) || "更新失敗");
      }

      await mutateOrders();
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

    setProcessingEdit((prev) => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch("/api/admin/noname-master/recreate-label", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data.message || data.error) || "更新失敗");
      }

      await mutateOrders();
      setShowEditMenu(null);
      alert("ラベル作り直しの準備が完了しました。発送リストに追加されました。");
    } catch (err) {
      console.error("Recreate label error:", err);
      alert(err instanceof Error ? err.message : "処理に失敗しました");
    } finally {
      setProcessingEdit((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // 返金・キャンセル実行
  const handleRefund = async () => {
    if (!refundTarget) return;
    setRefundProcessing(true);
    setRefundError("");

    const isBankTransfer = refundTarget.payment_method === "銀行振込";

    try {
      let res: Response;

      if (isBankTransfer) {
        // 銀行振込: bank-transfer/cancel APIを使用（キャンセル or 返金）
        res = await fetch("/api/admin/bank-transfer/cancel", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: refundTarget.id,
            action: bankAction,
            memo: refundMemo || undefined,
          }),
        });
      } else {
        // クレカ: 従来通りnoname-master/refund APIを使用
        res = await fetch("/api/admin/noname-master/refund", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: refundTarget.id,
            admin_token: refundToken,
            memo: refundMemo || undefined,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error((data.message || data.error) || "処理に失敗しました");
      }

      // ローカルstate更新
      await mutateOrders();

      setRefundTarget(null);
      setRefundStep("token");
      setRefundToken("");
      setRefundMemo("");
      setBankAction("cancel");

      if (isBankTransfer) {
        alert(bankAction === "refund" ? "返金処理が完了しました（返金待ち）" : "キャンセルが完了しました");
      } else {
        alert("返金処理が完了しました");
      }
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setRefundProcessing(false);
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

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {/* 決済方法フィルター */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => { setPaymentMethod("all"); setPage(1); }}
              className={`px-3 py-1 text-sm rounded ${paymentMethod === "all" ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
            >
              全て
            </button>
            <button
              onClick={() => { setPaymentMethod("credit_card"); setPage(1); }}
              className={`px-3 py-1 text-sm rounded ${paymentMethod === "credit_card" ? "bg-yellow-400 text-black shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              カード
            </button>
            <button
              onClick={() => { setPaymentMethod("bank_transfer"); setPage(1); }}
              className={`px-3 py-1 text-sm rounded ${paymentMethod === "bank_transfer" ? "bg-cyan-400 text-black shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              銀行振込
            </button>
          </div>
          {/* ステータスフィルター */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => { setStatusFilter("all"); setPage(1); }}
              className={`px-3 py-1 text-sm rounded ${statusFilter === "all" ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
            >
              全て
            </button>
            <button
              onClick={() => { setStatusFilter("unshipped"); setPage(1); }}
              className={`px-3 py-1 text-sm rounded ${statusFilter === "unshipped" ? "bg-orange-500 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              未発送
            </button>
            <button
              onClick={() => { setStatusFilter("shipped"); setPage(1); }}
              className={`px-3 py-1 text-sm rounded ${statusFilter === "shipped" ? "bg-green-500 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              発送済
            </button>
            <button
              onClick={() => { setStatusFilter("refund_cancel"); setPage(1); }}
              className={`px-3 py-1 text-sm rounded ${statusFilter === "refund_cancel" ? "bg-purple-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              返金・キャンセル
            </button>
          </div>
          <span className="text-sm text-slate-600">
            {totalCount} 件
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
      </div>

      {/* 返金サマリー */}
      {statusFilter === "refund_cancel" && ordersData?.refund_summary && ordersData.refund_summary.count > 0 && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg flex justify-between items-center">
          <span className="text-sm text-purple-700">
            返金件数: {ordersData.refund_summary.count} 件
          </span>
          <span className="text-sm font-medium text-purple-900">
            返金総額: ¥{ordersData.refund_summary.totalAmount.toLocaleString()}
          </span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  決済日時
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  決済方法
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  氏名
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  患者ID
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  商品名
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">
                  金額
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  〒
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  住所
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  電話番号
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  発送日
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  追跡番号
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">
                  変更
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  回数
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">
                  返金
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-6 py-8 text-center text-slate-500">
                    注文データがありません
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className={`hover:bg-slate-50 ${order.is_overdue ? "bg-red-50 border-l-4 border-l-red-500" : ""}`}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900">
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
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-1">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            order.payment_method === "クレジットカード"
                              ? "bg-yellow-300 text-black"
                              : "bg-cyan-300 text-black"
                          }`}
                        >
                          {order.payment_method}
                        </span>
                        {/* ステータスバッジ */}
                        {order.refund_status === "COMPLETED" && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">返金完了</span>
                        )}
                        {order.refund_status === "PENDING" && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">返金待ち</span>
                        )}
                        {order.refund_status === "FAILED" && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">返金失敗</span>
                        )}
                        {(order.refund_status === "CANCELLED" || (order.status === "cancelled" && !order.refund_status)) && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600">キャンセル</span>
                        )}
                        {!order.refund_status && order.status === "pending_confirmation" && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">確認待ち</span>
                        )}
                        {!order.refund_status && order.status === "confirmed" && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">確認済み</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-900 max-w-[200px] truncate" title={order.patient_name}>
                      {order.patient_name || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <button
                        onClick={() => window.open(`/admin/line/talk?pid=${order.patient_id}`, '_blank')}
                        className="text-blue-600 hover:text-blue-900 hover:underline font-mono"
                      >
                        {order.patient_id}
                      </button>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900">
                      {order.product_name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-slate-900">
                      {order.amount ? `¥${order.amount.toLocaleString()}` : "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 font-mono">
                      {order.postal_code || "-"}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-600 max-w-xs truncate" title={order.address}>
                      {order.address || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 font-mono">
                      {order.phone || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600">
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
                      ) : statusFilter === "unshipped" ? (
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
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-mono">
                      {order.tracking_number ? (
                        <a
                          href={buildTrackingUrl(order.tracking_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 hover:underline"
                        >
                          {order.tracking_number}
                        </a>
                      ) : order.refund_status ? (
                        <span className="text-purple-600 font-medium">返金済</span>
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
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center relative">
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
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold">
                        {order.purchase_count}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                      {order.refund_status === "COMPLETED" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          返金済
                        </span>
                      ) : order.refund_status === "PENDING" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          返金待ち
                        </span>
                      ) : order.status === "cancelled" ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        <button
                          onClick={() => {
                            setRefundTarget(order);
                            setRefundStep("token");
                            setRefundToken("");
                            setRefundMemo("");
                            setRefundError("");
                            setBankAction("cancel");
                          }}
                          className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                        >
                          返金
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

      {/* 返金モーダル */}
      {refundTarget && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => !refundProcessing && setRefundTarget(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {refundTarget.payment_method === "銀行振込" ? "キャンセル・返金" : "返金処理"}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {refundStep === "token"
                  ? "管理者トークンを入力してください"
                  : refundStep === "action"
                  ? "処理内容を選択してください"
                  : "内容を確認してください"}
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* 注文情報 */}
              <div className="bg-slate-50 rounded p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">患者ID:</span>
                  <span className="font-mono text-slate-900">{refundTarget.patient_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">氏名:</span>
                  <span className="text-slate-900">{refundTarget.patient_name || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">商品:</span>
                  <span className="text-slate-900">{refundTarget.product_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">金額:</span>
                  <span className="font-medium text-red-600">
                    ¥{(refundTarget.amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">決済方法:</span>
                  <span className="text-slate-900">{refundTarget.payment_method}</span>
                </div>
              </div>

              {refundStep === "token" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    管理者トークン
                  </label>
                  <input
                    type="password"
                    value={refundToken}
                    onChange={(e) => setRefundToken(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && refundToken) {
                        setRefundStep(refundTarget.payment_method === "銀行振込" ? "action" : "confirm");
                      }
                    }}
                    placeholder="ADMIN_TOKEN を入力"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    autoFocus
                  />
                </div>
              )}

              {refundStep === "action" && (
                <>
                  {/* 銀行振込: キャンセル/返金の選択（照合ページと同じUI） */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">処理内容</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                        <input
                          type="radio"
                          name="bankAction"
                          value="cancel"
                          checked={bankAction === "cancel"}
                          onChange={() => setBankAction("cancel")}
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
                          name="bankAction"
                          value="refund"
                          checked={bankAction === "refund"}
                          onChange={() => setBankAction("refund")}
                          className="text-blue-600"
                        />
                        <div>
                          <div className="text-sm font-medium text-slate-900">返金（振込済み）</div>
                          <div className="text-xs text-slate-500">実際に振込があり、返金対応が必要な場合</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">メモ（任意）</label>
                    <input
                      type="text"
                      value={refundMemo}
                      onChange={(e) => setRefundMemo(e.target.value)}
                      placeholder="例: 重複入力のため"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className={`border rounded p-3 ${
                    bankAction === "refund"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}>
                    <p className={`text-sm ${
                      bankAction === "refund" ? "text-red-800" : "text-yellow-800"
                    }`}>
                      <strong>注意:</strong>{" "}
                      {bankAction === "refund"
                        ? "注文がキャンセルされ「返金待ち」として記録されます。実際の振込返金は手動で行ってください。"
                        : "注文が取り消されます。返金処理は行われません。"}
                    </p>
                  </div>
                </>
              )}

              {refundStep === "confirm" && (
                <>
                  {/* クレカ用の確認ステップ */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      メモ（任意）
                    </label>
                    <input
                      type="text"
                      value={refundMemo}
                      onChange={(e) => setRefundMemo(e.target.value)}
                      placeholder="例: 患者希望による返金"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-800">
                      <strong>注意:</strong>{" "}
                      Squareを通じてクレジットカードへの全額返金を実行します。この操作は取り消せません。
                    </p>
                  </div>
                </>
              )}

              {refundError && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-700">{refundError}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  if (refundStep === "confirm") {
                    setRefundStep("token");
                    setRefundError("");
                  } else if (refundStep === "action") {
                    setRefundStep("token");
                    setRefundError("");
                  } else {
                    setRefundTarget(null);
                  }
                }}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                disabled={refundProcessing}
              >
                {refundStep === "token" ? "閉じる" : "戻る"}
              </button>

              {refundStep === "token" && (
                <button
                  onClick={() => {
                    setRefundStep(refundTarget.payment_method === "銀行振込" ? "action" : "confirm");
                  }}
                  disabled={!refundToken}
                  className="px-4 py-2 text-sm rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              )}

              {(refundStep === "action" || refundStep === "confirm") && (
                <button
                  onClick={handleRefund}
                  disabled={refundProcessing}
                  className={`px-4 py-2 text-sm rounded-lg font-medium ${
                    refundProcessing
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {refundProcessing
                    ? "処理中..."
                    : refundStep === "action"
                    ? (bankAction === "refund" ? "返金処理を実行" : "キャンセルを実行")
                    : "返金を実行"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
