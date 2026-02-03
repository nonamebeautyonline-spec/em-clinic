"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type RefundItem = {
  id: string;
  patient_id: string;
  patient_name?: string;
  amount: number;
  refunded_amount: number;
  refund_status: string;
  refunded_at: string;
  status: string;
  created_at: string;
  product_code: string;
};

export default function RefundsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "COMPLETED" | "PENDING">("all");

  useEffect(() => {
    loadRefunds();
  }, []);

  const loadRefunds = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/refunds", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`エラー: ${response.status}`);
      }

      const data = await response.json();
      setRefunds(data.refunds || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRefunds = filter === "all"
    ? refunds
    : refunds.filter(r => r.refund_status === filter);

  const formatDate = (isoString: string) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">返金完了</span>;
      case "PENDING":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">保留中</span>;
      case "FAILED":
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">失敗</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{status}</span>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">返金一覧</h1>
        <button
          onClick={() => router.push("/admin")}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          ← 戻る
        </button>
      </div>

      {/* フィルター */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm rounded ${
            filter === "all"
              ? "bg-blue-500 text-white"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          全て ({refunds.length})
        </button>
        <button
          onClick={() => setFilter("COMPLETED")}
          className={`px-4 py-2 text-sm rounded ${
            filter === "COMPLETED"
              ? "bg-green-500 text-white"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          返金完了 ({refunds.filter(r => r.refund_status === "COMPLETED").length})
        </button>
        <button
          onClick={() => setFilter("PENDING")}
          className={`px-4 py-2 text-sm rounded ${
            filter === "PENDING"
              ? "bg-yellow-500 text-white"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          保留中 ({refunds.filter(r => r.refund_status === "PENDING").length})
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      )}

      {/* 返金一覧 */}
      {!loading && !error && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">返金日時</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">患者ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">注文ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">商品</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">返金額</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">ステータス</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRefunds.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      返金データがありません
                    </td>
                  </tr>
                ) : (
                  filteredRefunds.map((refund) => (
                    <tr key={refund.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(refund.refunded_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/admin/view-mypage?patient_id=${refund.patient_id}`)}
                          className="text-blue-600 hover:underline"
                        >
                          {refund.patient_id}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{refund.id.substring(0, 20)}...</td>
                      <td className="px-4 py-3">{refund.product_code}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        ¥{refund.refunded_amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(refund.refund_status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => router.push(`/admin/patients/${refund.patient_id}`)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          詳細
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* サマリー */}
          {filteredRefunds.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  合計 {filteredRefunds.length} 件
                </span>
                <span className="font-medium text-gray-900">
                  返金総額: ¥
                  {filteredRefunds
                    .reduce((sum, r) => sum + r.refunded_amount, 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
