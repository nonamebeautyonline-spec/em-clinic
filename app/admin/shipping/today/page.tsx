"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ShippingItem {
  id: string;
  patient_id: string;
  patient_name: string;
  lstep_id: string;
  product_code: string;
  product_name: string;
  payment_method: string;
  payment_date: string;
  amount: number;
  postal_code: string;
  address: string;
  phone: string;
  email: string;
  purchase_count: number;
}

export default function TodayShippingListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShippingItem[]>([]);
  const [error, setError] = useState("");
  const [cutoffTime, setCutoffTime] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    loadTodayShippingList(token);
  }, [router]);

  const loadTodayShippingList = async (token: string) => {
    setLoading(true);
    setError("");

    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(15, 0, 0, 0);

      setCutoffTime(
        yesterday.toLocaleString("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      );

      const res = await fetch("/api/admin/shipping/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`データ取得失敗 (${res.status})`);
      }

      const data = await res.json();
      setItems(data.orders || []);
    } catch (err) {
      console.error("Shipping list fetch error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
      {/* 印刷時は非表示 */}
      <div className="mb-6 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">本日の発送リスト</h1>
            <p className="text-slate-600 text-sm mt-1">
              {cutoffTime} 以降の未発送注文 - 合計 {items.length} 件
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            🖨️ 印刷
          </button>
        </div>
      </div>

      {/* 印刷時のヘッダー */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold text-slate-900">発送リスト</h1>
        <p className="text-sm text-slate-600 mt-1">
          {new Date().toLocaleDateString("ja-JP")} - 合計 {items.length} 件
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 print:hidden">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
          本日の発送対象はありません
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  No.
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  患者名
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  LステップID
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  商品
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  郵便番号
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  住所
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  電話番号
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  決済
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase print:hidden">
                  患者ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-900 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-900">
                    {item.patient_name || "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-600 text-xs">
                    {item.lstep_id || "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-900">
                    {item.product_name}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-600">
                    {item.postal_code || "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-600 max-w-xs">
                    {item.address || "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-600">
                    {item.phone || "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        item.payment_method === "クレジットカード"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {item.payment_method === "クレジットカード" ? "クレカ" : "振込"}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-slate-400 print:hidden">
                    {item.patient_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 印刷用のフッター */}
      <div className="hidden print:block mt-6 text-xs text-slate-500 text-center">
        印刷日時: {new Date().toLocaleString("ja-JP")}
      </div>

      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          table {
            font-size: 10px;
          }
          th,
          td {
            padding: 4px 6px !important;
          }
        }
      `}</style>
    </div>
  );
}
