"use client";

import { useState, useEffect } from "react";

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
  debug?: {
    csvTransfers: Array<{ date: string; description: string; amount: number; descNormalized: string }>;
    pendingOrders: Array<{ id: string; patient_id: string; amount: number; account_name: string; accountNormalized: string }>;
    totalTransfers: number;
    totalPendingOrders: number;
  };
}

interface PendingOrder {
  id: string;
  patient_id: string;
  patient_name: string;
  product_code: string;
  product_name: string;
  amount: number;
  shipping_name: string;
  account_name: string;
  address: string;
  postal_code: string;
  phone: string;
  created_at: string;
}

export default function BankTransferReconcilePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [error, setError] = useState("");
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [previewResult, setPreviewResult] = useState<ReconcileResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  // 手動確認モーダル用
  const [manualConfirmOrder, setManualConfirmOrder] = useState<PendingOrder | null>(null);
  const [manualConfirmMemo, setManualConfirmMemo] = useState("");
  const [manualConfirming, setManualConfirming] = useState(false);

  useEffect(() => {
    loadPendingOrders();
  }, []);

  const loadPendingOrders = async () => {
    setLoadingPending(true);
    try {
      const res = await fetch("/api/admin/bank-transfer/pending", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`データ取得失敗 (${res.status})`);
      }

      const data = await res.json();
      setPendingOrders(data.orders || []);
    } catch (err) {
      console.error("Pending orders fetch error:", err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError("");
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setError("CSVファイルを選択してください");
      return;
    }

    setLoading(true);
    setError("");
    setPreviewResult(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/bank-transfer/reconcile/preview", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `エラー (${res.status})`);
      }

      const data = await res.json();
      setPreviewResult(data);
    } catch (err) {
      console.error("Preview error:", err);
      setError(err instanceof Error ? err.message : "照合プレビューに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewResult) return;

    setConfirming(true);
    setError("");

    try {
      const res = await fetch("/api/admin/bank-transfer/reconcile/confirm", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matches: previewResult.matched }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `エラー (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
      setPreviewResult(null);
      setFile(null);
      loadPendingOrders(); // 未照合一覧を更新
    } catch (err) {
      console.error("Confirm error:", err);
      setError(err instanceof Error ? err.message : "照合確定に失敗しました");
    } finally {
      setConfirming(false);
    }
  };

  // 手動確認処理
  const handleManualConfirm = async () => {
    if (!manualConfirmOrder) return;

    setManualConfirming(true);
    setError("");

    try {
      const res = await fetch("/api/admin/bank-transfer/manual-confirm", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: manualConfirmOrder.id,
          memo: manualConfirmMemo,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `エラー (${res.status})`);
      }

      // 成功したらモーダルを閉じて一覧を更新
      setManualConfirmOrder(null);
      setManualConfirmMemo("");
      loadPendingOrders();
    } catch (err) {
      console.error("Manual confirm error:", err);
      setError(err instanceof Error ? err.message : "手動確認に失敗しました");
    } finally {
      setManualConfirming(false);
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

      {/* 未照合一覧 */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">未照合一覧</h2>
            <p className="text-sm text-slate-600 mt-1">振込確認待ちの注文（{pendingOrders.length}件）</p>
          </div>
          <button
            onClick={loadPendingOrders}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            🔄 更新
          </button>
        </div>
        <div className="overflow-x-auto">
          {loadingPending ? (
            <div className="p-8 text-center text-slate-500">読み込み中...</div>
          ) : pendingOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-500">未照合の注文はありません</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    申請日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    患者ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    氏名（振込名義）
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    商品名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    送付先
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {pendingOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {new Date(order.created_at).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                      <button onClick={() => window.open(`/admin/line/talk?pid=${order.patient_id}`, '_blank')} className="text-blue-600 hover:text-blue-900 hover:underline">
                        {order.patient_id}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {order.patient_name || "-"}
                      {order.account_name && (
                        <span className="text-slate-500">（{order.account_name}）</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {order.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      ¥{order.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      〒{order.postal_code} {order.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          setManualConfirmOrder(order);
                          setManualConfirmMemo("");
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                      >
                        手動確認
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
          onClick={handlePreview}
          disabled={!file || loading}
          className={`px-6 py-3 rounded-lg font-medium ${
            !file || loading
              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {loading ? "照合確認中..." : "🔍 照合確認"}
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

      {/* 照合確認プレビュー（Lステップ風） */}
      {previewResult && (
        <div className="mb-6 bg-white rounded-lg shadow">
          <div className="px-6 py-4 bg-green-50 border-b border-green-200">
            <h2 className="text-lg font-semibold text-green-900">2. データ確認</h2>
            <p className="text-sm text-green-700 mt-1">
              照合候補 {previewResult.matched.length}件を表示します。問題なければ「このデータを反映する」ボタンを押してください。
            </p>
          </div>

          {previewResult.matched.length > 0 && (
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {previewResult.matched.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        ✅ {item.transfer.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {item.transfer.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        ¥{item.transfer.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        <button onClick={() => window.open(`/admin/line/talk?pid=${item.order.patient_id}`, '_blank')} className="text-blue-600 hover:text-blue-900 hover:underline">
                          {item.order.patient_id}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {item.order.product_code}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              マッチ: <span className="font-semibold text-green-600">{previewResult.matched.length}件</span>
              {previewResult.unmatched.length > 0 && (
                <span className="ml-4">
                  未マッチ: <span className="font-semibold text-yellow-600">{previewResult.unmatched.length}件</span>
                </span>
              )}
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming || previewResult.matched.length === 0}
              className={`px-6 py-3 rounded-lg font-medium ${
                confirming || previewResult.matched.length === 0
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {confirming ? "反映中..." : "このデータを反映する"}
            </button>
          </div>

          {/* ★ デバッグ情報セクション */}
          {previewResult.debug && (
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-300">
              <details>
                <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                  🔍 照合デバッグ情報（クリックで表示）
                </summary>
                <div className="mt-4 space-y-4">
                  <div className="bg-white rounded p-4">
                    <h4 className="font-semibold text-sm text-slate-700 mb-2">
                      📊 全体統計
                    </h4>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>CSVの振込データ: {previewResult.debug.totalTransfers}件</p>
                      <p>未照合の注文: {previewResult.debug.totalPendingOrders}件</p>
                    </div>
                  </div>

                  <div className="bg-white rounded p-4">
                    <h4 className="font-semibold text-sm text-slate-700 mb-2">
                      📄 CSVデータサンプル（最初の5件）
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-2 py-1 text-left">日付</th>
                            <th className="px-2 py-1 text-left">摘要</th>
                            <th className="px-2 py-1 text-left">金額</th>
                            <th className="px-2 py-1 text-left">正規化後</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewResult.debug.csvTransfers.map((t, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-2 py-1">{t.date}</td>
                              <td className="px-2 py-1">{t.description}</td>
                              <td className="px-2 py-1">¥{t.amount.toLocaleString()}</td>
                              <td className="px-2 py-1 font-mono text-blue-600">{t.descNormalized}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded p-4">
                    <h4 className="font-semibold text-sm text-slate-700 mb-2">
                      💳 未照合注文サンプル（最初の5件）
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-2 py-1 text-left">注文ID</th>
                            <th className="px-2 py-1 text-left">患者ID</th>
                            <th className="px-2 py-1 text-left">金額</th>
                            <th className="px-2 py-1 text-left">振込名義人</th>
                            <th className="px-2 py-1 text-left">正規化後</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewResult.debug.pendingOrders.map((o, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-2 py-1 font-mono">{o.id}</td>
                              <td className="px-2 py-1 font-mono">
                                <button onClick={() => window.open(`/admin/line/talk?pid=${o.patient_id}`, '_blank')} className="text-blue-600 hover:underline">
                                  {o.patient_id}
                                </button>
                              </td>
                              <td className="px-2 py-1">¥{o.amount.toLocaleString()}</td>
                              <td className="px-2 py-1">{o.account_name}</td>
                              <td className="px-2 py-1 font-mono text-blue-600">{o.accountNormalized}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          <button onClick={() => window.open(`/admin/line/talk?pid=${item.order.patient_id}`, '_blank')} className="text-blue-600 hover:text-blue-900 hover:underline">
                            {item.order.patient_id}
                          </button>
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

      {/* 手動確認モーダル */}
      {manualConfirmOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">銀行振込を手動確認</h3>
              <p className="text-sm text-slate-600 mt-1">
                この注文を振込確認済みとして処理します
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-slate-50 rounded p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">患者ID:</span>
                  <button onClick={() => window.open(`/admin/line/talk?pid=${manualConfirmOrder.patient_id}`, '_blank')} className="font-mono text-blue-600 hover:text-blue-900 hover:underline">
                    {manualConfirmOrder.patient_id}
                  </button>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">氏名:</span>
                  <span className="text-slate-900">
                    {manualConfirmOrder.patient_name || "-"}
                    {manualConfirmOrder.account_name && (
                      <span className="text-slate-500">（{manualConfirmOrder.account_name}）</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">商品:</span>
                  <span className="text-slate-900">{manualConfirmOrder.product_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">金額:</span>
                  <span className="font-medium text-slate-900">¥{manualConfirmOrder.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">申請日時:</span>
                  <span className="text-slate-900">
                    {new Date(manualConfirmOrder.created_at).toLocaleString("ja-JP")}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  メモ（任意）
                </label>
                <input
                  type="text"
                  value={manualConfirmMemo}
                  onChange={(e) => setManualConfirmMemo(e.target.value)}
                  placeholder="例: 振込名義違いのため手動確認"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">
                  <strong>注意:</strong> この操作を実行すると、注文のステータスが「confirmed」に変更され、発送可能な状態になります。
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setManualConfirmOrder(null);
                  setManualConfirmMemo("");
                }}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                disabled={manualConfirming}
              >
                キャンセル
              </button>
              <button
                onClick={handleManualConfirm}
                disabled={manualConfirming}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${
                  manualConfirming
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {manualConfirming ? "処理中..." : "確認済みにする"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
