"use client";

import { useState, useEffect, useRef } from "react";

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

interface AmountMismatchItem {
  transfer: {
    date: string;
    description: string;
    amount: number;
  };
  order: {
    id: string;
    patient_id: string;
    product_code: string;
    product_name?: string;
    amount: number;
  };
  difference: number;
}

interface UnmatchedItem {
  date: string;
  description: string;
  amount: number;
  reason: string;
}

interface ReconcileResult {
  mode?: "order_based" | "statement_based";
  matched: MatchedItem[];
  amountMismatch?: AmountMismatchItem[];
  unmatched: UnmatchedItem[];
  summary: {
    total: number;
    matched: number;
    amountMismatch?: number;
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
  // 商品変更モーダル用
  const [changeProductOrder, setChangeProductOrder] = useState<PendingOrder | null>(null);
  const [newProductCode, setNewProductCode] = useState("");
  const [changeProductMemo, setChangeProductMemo] = useState("");
  const [changingProduct, setChangingProduct] = useState(false);
  const [products, setProducts] = useState<Array<{ code: string; title: string; price: number }>>([]);
  // 照合モード
  const [reconcileMode, setReconcileMode] = useState<"order_based" | "statement_based">("order_based");
  // CSVフォーマット
  const [csvFormat, setCsvFormat] = useState<"gmo" | "paypay">("paypay");
  // 金額不一致の選択状態
  const [selectedMismatches, setSelectedMismatches] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    loadPendingOrders();
    // テナントの照合モード設定を取得
    fetch("/api/admin/settings?category=payment", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.reconcile_mode) {
          setReconcileMode(data.settings.reconcile_mode as "order_based" | "statement_based");
        }
      })
      .catch(() => {});
    // 商品一覧を取得（商品変更ドロップダウン用）
    fetch("/api/admin/products", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.products) {
          setProducts((data.products as Array<{ code: string; title: string; price: number }>).map((p) => ({ code: p.code, title: p.title, price: p.price })));
        }
      })
      .catch(() => {});
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

  const handleUploadClick = () => {
    if (fileDialogOpen) return;
    setFileDialogOpen(true);
    fileInputRef.current?.click();
    const reset = () => { setFileDialogOpen(false); window.removeEventListener("focus", reset); };
    window.addEventListener("focus", reset);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileDialogOpen(false);
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
      formData.append("csvFormat", csvFormat);

      const res = await fetch("/api/admin/bank-transfer/reconcile/preview", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error((errorData.message || errorData.error) || `エラー (${res.status})`);
      }

      const data = await res.json();
      setPreviewResult(data);
      setSelectedMismatches(new Set());
      if (data.mode) {
        setReconcileMode(data.mode);
      }
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

    // matched + 選択された金額不一致項目を統合
    const selectedMismatchItems = (previewResult.amountMismatch || [])
      .filter((_, i) => selectedMismatches.has(i))
      .map((item) => ({
        transfer: item.transfer,
        order: item.order,
        newPaymentId: null,
        updateSuccess: false,
      }));
    const allMatches = [...previewResult.matched, ...selectedMismatchItems];

    try {
      const res = await fetch("/api/admin/bank-transfer/reconcile/confirm", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matches: allMatches }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error((errorData.message || errorData.error) || `エラー (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
      setPreviewResult(null);
      setFile(null);
      setFileInputKey((k) => k + 1);
      setSelectedMismatches(new Set());
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
        throw new Error((errorData.message || errorData.error) || `エラー (${res.status})`);
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

  // 商品変更処理
  const handleChangeProduct = async () => {
    if (!changeProductOrder || !newProductCode) return;

    setChangingProduct(true);
    setError("");

    try {
      const res = await fetch("/api/admin/bank-transfer/change-product", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: changeProductOrder.id,
          new_product_code: newProductCode,
          memo: changeProductMemo || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error((errorData.message || errorData.error) || `エラー (${res.status})`);
      }

      setChangeProductOrder(null);
      setNewProductCode("");
      setChangeProductMemo("");
      setPreviewResult(null);
      loadPendingOrders();
    } catch (err) {
      console.error("Change product error:", err);
      setError(err instanceof Error ? err.message : "商品変更に失敗しました");
    } finally {
      setChangingProduct(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">銀行振込CSV一括照合</h1>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
            reconcileMode === "statement_based"
              ? "bg-purple-100 text-purple-800"
              : "bg-slate-100 text-slate-700"
          }`}>
            {reconcileMode === "statement_based" ? "専用口座モード" : "共用口座モード"}
          </span>
        </div>
        <p className="text-slate-600 text-sm mt-1">
          {reconcileMode === "statement_based"
            ? "銀行明細の全入金を患者注文と照合します（専用口座向け）"
            : "銀行CSVをアップロードして、振込確認待ちの注文と自動照合します"}
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
                        <span className={/[\u30A0-\u30FF]/.test(order.account_name) ? "text-slate-500" : "text-red-500 font-medium"}>
                          （{order.account_name}）
                        </span>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => {
                          setChangeProductOrder(order);
                          setNewProductCode("");
                          setChangeProductMemo("");
                        }}
                        className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-xs"
                      >
                        商品変更
                      </button>
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

        {/* CSVフォーマット選択 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            CSVフォーマット
          </label>
          <div className="flex gap-3">
            <label
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                csvFormat === "paypay"
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="csvFormat"
                value="paypay"
                checked={csvFormat === "paypay"}
                onChange={() => setCsvFormat("paypay")}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-slate-900">PayPay銀行</span>
            </label>
            <label
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                csvFormat === "gmo"
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="csvFormat"
                value="gmo"
                checked={csvFormat === "gmo"}
                onChange={() => setCsvFormat("gmo")}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-slate-900">住信SBIネット銀行</span>
            </label>
          </div>
          {csvFormat === "paypay" && (
            <p className="mt-2 text-xs text-slate-500">「お預り金額」が0より大きい行が照合対象です</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            CSVファイル
          </label>
          <input
            key={fileInputKey}
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={fileDialogOpen}
            className="inline-flex items-center py-2 px-4 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CSVファイルを選択
          </button>
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
          {loading ? "照合確認中..." : "照合確認"}
        </button>

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

          {/* 金額不一致セクション */}
          {previewResult.amountMismatch && previewResult.amountMismatch.length > 0 && (
            <div className="border-t border-orange-200">
              <div className="px-6 py-4 bg-orange-50">
                <h3 className="text-base font-semibold text-orange-900">
                  金額不一致（{previewResult.amountMismatch.length}件）
                </h3>
                <p className="text-sm text-orange-700 mt-1">
                  名義人は一致しますが金額が異なります。確認して反映対象に含める場合はチェックしてください
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        選択
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        振込日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        名義人
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        振込金額
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        注文金額
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        差額
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        患者ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {previewResult.amountMismatch.map((item, i) => (
                      <tr key={i} className="hover:bg-orange-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedMismatches.has(i)}
                            onChange={(e) => {
                              const next = new Set(selectedMismatches);
                              if (e.target.checked) {
                                next.add(i);
                              } else {
                                next.delete(i);
                              }
                              setSelectedMismatches(next);
                            }}
                            className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.transfer.date}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {item.transfer.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          ¥{item.transfer.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          ¥{item.order.amount.toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                          item.difference > 0 ? "text-blue-600" : "text-red-600"
                        }`}>
                          {item.difference > 0 ? "+" : ""}¥{item.difference.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          <button onClick={() => window.open(`/admin/line/talk?pid=${item.order.patient_id}`, '_blank')} className="text-blue-600 hover:text-blue-900 hover:underline">
                            {item.order.patient_id}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => {
                              setChangeProductOrder({
                                id: item.order.id,
                                patient_id: item.order.patient_id,
                                patient_name: "",
                                product_code: item.order.product_code,
                                product_name: item.order.product_name || item.order.product_code,
                                amount: item.order.amount,
                                shipping_name: "",
                                account_name: item.transfer.description,
                                address: "",
                                postal_code: "",
                                phone: "",
                                created_at: "",
                              });
                              setNewProductCode("");
                              setChangeProductMemo("");
                            }}
                            className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-xs"
                          >
                            商品変更
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 未マッチセクション（プレビュー内） */}
          {previewResult.unmatched.length > 0 && (
            <div className={`border-t ${
              reconcileMode === "statement_based" ? "border-red-200" : "border-yellow-200"
            }`}>
              <div className={`px-6 py-4 ${
                reconcileMode === "statement_based" ? "bg-red-50" : "bg-yellow-50"
              }`}>
                <h3 className={`text-base font-semibold ${
                  reconcileMode === "statement_based" ? "text-red-900" : "text-yellow-900"
                }`}>
                  {reconcileMode === "statement_based"
                    ? `不明な入金（${previewResult.unmatched.length}件）`
                    : `未マッチ（${previewResult.unmatched.length}件）`}
                </h3>
                <p className={`text-sm mt-1 ${
                  reconcileMode === "statement_based" ? "text-red-700" : "text-yellow-700"
                }`}>
                  {reconcileMode === "statement_based"
                    ? "専用口座への入金ですが、対応する注文が見つかりません。要確認"
                    : "以下の振込データは該当する注文が見つかりませんでした"}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">振込日</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">摘要（名義人）</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">金額</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">理由</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {previewResult.unmatched.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.date}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{item.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">¥{item.amount.toLocaleString()}</td>
                        <td className={`px-6 py-4 text-sm ${
                          reconcileMode === "statement_based" ? "text-red-700" : "text-yellow-700"
                        }`}>{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              マッチ: <span className="font-semibold text-green-600">{previewResult.matched.length}件</span>
              {(previewResult.amountMismatch?.length ?? 0) > 0 && (
                <span className="ml-4">
                  金額不一致: <span className="font-semibold text-orange-600">
                    {previewResult.amountMismatch!.length}件
                    {selectedMismatches.size > 0 && `（${selectedMismatches.size}件選択中）`}
                  </span>
                </span>
              )}
              {previewResult.unmatched.length > 0 && (
                <span className="ml-4">
                  未マッチ: <span className={`font-semibold ${
                    reconcileMode === "statement_based" ? "text-red-600" : "text-yellow-600"
                  }`}>{previewResult.unmatched.length}件</span>
                </span>
              )}
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming || (previewResult.matched.length === 0 && selectedMismatches.size === 0)}
              className={`px-6 py-3 rounded-lg font-medium ${
                confirming || (previewResult.matched.length === 0 && selectedMismatches.size === 0)
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {confirming ? "反映中..." : `このデータを反映する（${previewResult.matched.length + selectedMismatches.size}件）`}
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
              <div className={`px-6 py-4 border-b ${
                reconcileMode === "statement_based"
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}>
                <h2 className={`text-lg font-semibold ${
                  reconcileMode === "statement_based" ? "text-red-900" : "text-yellow-900"
                }`}>
                  {reconcileMode === "statement_based"
                    ? `不明な入金（${result.unmatched.length}件）`
                    : `未マッチ（${result.unmatched.length}件）`}
                </h2>
                <p className={`text-sm mt-1 ${
                  reconcileMode === "statement_based" ? "text-red-700" : "text-yellow-700"
                }`}>
                  {reconcileMode === "statement_based"
                    ? "専用口座への入金ですが、対応する注文が見つかりません。要確認"
                    : "以下の振込データは該当する注文が見つかりませんでした"}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">振込日</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">摘要（名義人）</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">金額</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">理由</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {result.unmatched.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.date}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{item.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">¥{item.amount.toLocaleString()}</td>
                        <td className={`px-6 py-4 text-sm ${
                          reconcileMode === "statement_based" ? "text-red-700" : "text-yellow-700"
                        }`}>{item.reason}</td>
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

      {/* 商品変更モーダル */}
      {changeProductOrder && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => !changingProduct && setChangeProductOrder(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">商品変更</h3>
              <p className="text-sm text-slate-600 mt-1">
                この注文の商品を変更します（金額も自動更新されます）
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* 注文情報 */}
              <div className="bg-slate-50 rounded p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">患者ID:</span>
                  <button
                    onClick={() => window.open(`/admin/line/talk?pid=${changeProductOrder.patient_id}`, "_blank")}
                    className="font-mono text-blue-600 hover:text-blue-900 hover:underline"
                  >
                    {changeProductOrder.patient_id}
                  </button>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">氏名:</span>
                  <span className="text-slate-900">{changeProductOrder.patient_name || changeProductOrder.shipping_name || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">現在の商品:</span>
                  <span className="text-slate-900">{changeProductOrder.product_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">現在の金額:</span>
                  <span className="font-medium text-slate-900">¥{changeProductOrder.amount.toLocaleString()}</span>
                </div>
              </div>

              {/* 新商品選択 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">変更先の商品</label>
                <select
                  value={newProductCode}
                  onChange={(e) => setNewProductCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">選択してください</option>
                  {products
                    .filter((p) => p.code !== changeProductOrder.product_code)
                    .map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.title} (¥{p.price.toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              {/* 変更後の金額・差額表示 */}
              {newProductCode && (() => {
                const newPrice = products.find((p) => p.code === newProductCode)?.price || 0;
                const diff = newPrice - changeProductOrder.amount;
                return (
                  <div className="bg-orange-50 border border-orange-200 rounded p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-800">変更後の金額:</span>
                      <span className="font-bold text-orange-900">¥{newPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-800">差額:</span>
                      <span className={`font-bold ${diff >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        {diff >= 0 ? "+" : ""}¥{diff.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* メモ */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">メモ（任意）</label>
                <input
                  type="text"
                  value={changeProductMemo}
                  onChange={(e) => setChangeProductMemo(e.target.value)}
                  placeholder="例: 患者から電話で2.5mg→5mgに変更依頼"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">
                  <strong>注意:</strong> 商品コード・商品名・金額が一括変更されます。振込金額との差額がある場合は別途確認してください。
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setChangeProductOrder(null);
                  setNewProductCode("");
                  setChangeProductMemo("");
                }}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                disabled={changingProduct}
              >
                閉じる
              </button>
              <button
                onClick={handleChangeProduct}
                disabled={changingProduct || !newProductCode}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${
                  changingProduct || !newProductCode
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                {changingProduct ? "処理中..." : "商品を変更する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
