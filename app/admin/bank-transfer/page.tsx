"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
}

export default function BankTransferManagementPage() {
  const router = useRouter();
  const [adminToken, setAdminToken] = useState("");
  const [orders, setOrders] = useState<BankTransferOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, pending, confirmed

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    setAdminToken(token);
    loadOrders(token);
  }, [router]);

  const loadOrders = async (token: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/bank-transfer-orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("データ取得失敗");
      }

      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTestData = async () => {
    if (!confirm("テストデータを削除しますか？")) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/bank-transfer/delete-test-data", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("削除失敗");
      }

      const data = await res.json();
      alert(`${data.deletedCount}件のテストデータを削除しました`);
      loadOrders(adminToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleBackfillToGAS = async () => {
    if (!confirm("全てのデータをGASシートにバックフィルしますか？")) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/bank-transfer/backfill-to-gas", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("バックフィル失敗");
      }

      const data = await res.json();
      alert(`${data.successCount}件をGASシートに同期しました`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const openGASSheet = () => {
    const sheetId = "1WL8zQ1PQDzLyLvl_w5StVvZU4T8nfbPGI5rxQvW5Vq0";
    window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, "_blank");
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    // ordersテーブルではaddressの有無でステータス判定
    if (filter === "pending_confirmation") return !order.address;
    if (filter === "confirmed") return !!order.address;
    return true;
  });

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
            📊 GASシートを開く
          </button>
          <button
            onClick={handleBackfillToGAS}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:bg-slate-400"
          >
            🔄 GASにバックフィル
          </button>
          <button
            onClick={handleDeleteTestData}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold disabled:bg-slate-400"
          >
            🗑️ テストデータ削除
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
            住所未入力 ({orders.filter((o) => !o.address).length})
          </button>
          <button
            onClick={() => setFilter("confirmed")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              filter === "confirmed"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-700 border border-slate-300"
            }`}
          >
            住所入力済み ({orders.filter((o) => !!o.address).length})
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">配送先氏名</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">住所</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">発送日</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">ステータス</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">注文日時</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        データがありません
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">{order.patient_id}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{order.patient_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{order.product_code || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{order.shipping_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                          {order.address ? (
                            <span title={order.address}>{order.address}</span>
                          ) : (
                            <span className="text-red-600 font-semibold">未入力</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{order.shipping_date || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                              order.address
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {order.address ? "住所あり" : "住所なし"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(order.created_at).toLocaleString("ja-JP")}
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
        <h2 className="text-lg font-bold text-blue-900 mb-4">📋 GASシート操作ガイド</h2>
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
    </div>
  );
}
