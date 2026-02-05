"use client";

import { useState } from "react";

interface OrderInfo {
  id: number;
  date: string;
  product: string;
  amount: string;
  payment: string;
  tracking: string;
  status: string;
}

interface ReorderInfo {
  id: number;
  date: string;
  product: string;
  status: string;
}

interface PatientResult {
  id: string;
  name: string;
  lstep_uid: string;
  orders: OrderInfo[];
  reorders: ReorderInfo[];
}

export default function PatientSearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PatientResult | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const adminToken = localStorage.getItem("adminToken") || "";
      const res = await fetch(
        `/api/admin/patient-lookup?q=${encodeURIComponent(query.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "検索に失敗しました");
        return;
      }

      if (!data.found) {
        setError("患者が見つかりませんでした");
        return;
      }

      setResult({
        id: data.patient.id,
        name: data.patient.name,
        lstep_uid: data.patient.lstep_uid,
        orders: data.orders || [],
        reorders: data.reorders || [],
      });
    } catch (err) {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSearch();
    }
  };

  const lstepUrl = result?.lstep_uid
    ? `https://page.line.me/614ycaga/timeline?openExternalBrowser=1&uid=${result.lstep_uid}`
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">患者検索</h1>

      {/* 検索フォーム */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="患者ID or 氏名を入力..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "検索中..." : "検索"}
          </button>
        </div>
      </div>

      {/* エラー */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 検索結果 */}
      {result && (
        <div className="space-y-6">
          {/* 患者基本情報 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{result.name}</h2>
                <p className="text-gray-600">患者ID: {result.id}</p>
              </div>
              {lstepUrl && (
                <a
                  href={lstepUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                  Lステップ
                </a>
              )}
            </div>
          </div>

          {/* 注文履歴 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b">
              <h3 className="font-bold">注文履歴 ({result.orders.length}件)</h3>
            </div>
            {result.orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">発送日</th>
                      <th className="px-4 py-2 text-left">商品</th>
                      <th className="px-4 py-2 text-left">金額</th>
                      <th className="px-4 py-2 text-left">決済</th>
                      <th className="px-4 py-2 text-left">追跡番号</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.orders.map((order, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{order.date}</td>
                        <td className="px-4 py-2">{order.product}</td>
                        <td className="px-4 py-2">{order.amount}</td>
                        <td className="px-4 py-2">{order.payment}</td>
                        <td className="px-4 py-2">
                          {order.tracking !== "-" ? (
                            <a
                              href={`https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=${order.tracking}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {order.tracking}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-gray-500">注文履歴がありません</div>
            )}
          </div>

          {/* 再処方履歴 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b">
              <h3 className="font-bold">再処方申請 ({result.reorders.length}件)</h3>
            </div>
            {result.reorders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">申請ID</th>
                      <th className="px-4 py-2 text-left">日時</th>
                      <th className="px-4 py-2 text-left">商品</th>
                      <th className="px-4 py-2 text-left">ステータス</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.reorders.map((reorder, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">#{reorder.id}</td>
                        <td className="px-4 py-2">{reorder.date}</td>
                        <td className="px-4 py-2">{reorder.product}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              reorder.status === "承認済み"
                                ? "bg-green-100 text-green-700"
                                : reorder.status === "承認待ち"
                                ? "bg-yellow-100 text-yellow-700"
                                : reorder.status === "決済済み"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {reorder.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-gray-500">再処方履歴がありません</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
