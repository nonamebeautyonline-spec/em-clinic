"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MatchedItem {
  transfer: {
    date: string;
    description: string;
    amount: number;
  };
  order: {
    patient_id: string;
    product_code: string;
    amount: number;
  };
  newPaymentId: string;
  updateSuccess: boolean;
}

interface UnmatchedItem {
  date: string;
  description: string;
  amount: number;
  reason: string;
}

interface ReconcileResult {
  matched: MatchedItem[];
  unmatched: UnmatchedItem[];
  summary: {
    total: number;
    matched: number;
    unmatched: number;
    updated: number;
  };
}

export default function BankTransferReconcilePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError("");
    }
  };

  const handleReconcile = async () => {
    if (!file) {
      setError("CSVファイルを選択してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/bank-transfer/reconcile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `エラー (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Reconcile error:", err);
      setError(err instanceof Error ? err.message : "照合処理に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">銀行振込CSV一括照合</h1>
        <p className="text-slate-600 text-sm mt-1">
          銀行CSVをアップロードして、振込確認待ちの注文と自動照合します
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">CSVファイル選択</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            銀行CSVファイル（三菱UFJ、三井住友、ゆうちょなど）
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-2 text-sm text-slate-600">
              選択中: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <button
          onClick={handleReconcile}
          disabled={!file || loading}
          className={`px-6 py-3 rounded-lg font-medium ${
            !file || loading
              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {loading ? "照合中..." : "🔍 自動照合を実行"}
        </button>

        <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
          <h3 className="font-semibold mb-2">📋 CSVフォーマット要件</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>1行目: ヘッダー（スキップされます）</li>
            <li>2行目以降: [日付, 摘要, 出金額, 入金額, 残高] など</li>
            <li>入金額が0より大きい行のみが照合対象です</li>
            <li>摘要に振込名義人（カタカナまたは漢字）が含まれている必要があります</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">エラー</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">照合結果サマリー</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">CSV総行数</p>
                <p className="text-2xl font-bold text-slate-900">{result.summary.total}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">マッチ成功</p>
                <p className="text-2xl font-bold text-green-700">{result.summary.matched}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">DB更新完了</p>
                <p className="text-2xl font-bold text-blue-700">{result.summary.updated}</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700">未マッチ</p>
                <p className="text-2xl font-bold text-yellow-700">{result.summary.unmatched}</p>
              </div>
            </div>
          </div>

          {result.matched.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-green-50 border-b border-green-200">
                <h2 className="text-lg font-semibold text-green-900">
                  ✅ マッチ成功（{result.matched.length}件）
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        振込日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        摘要（名義人）
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        金額
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        患者ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        商品コード
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Payment ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        更新状態
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {result.matched.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.transfer.date}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {item.transfer.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          ¥{item.transfer.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                          {item.order.patient_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {item.order.product_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-green-600">
                          {item.newPaymentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.updateSuccess ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              confirmed
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              失敗
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.unmatched.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
                <h2 className="text-lg font-semibold text-yellow-900">
                  ⚠️ 未マッチ（{result.unmatched.length}件）
                </h2>
                <p className="text-sm text-yellow-700 mt-1">
                  以下の振込データは該当する注文が見つかりませんでした
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        振込日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        摘要（名義人）
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        金額
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        理由
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {result.unmatched.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.date}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {item.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          ¥{item.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-yellow-700">
                          {item.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
