"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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

interface SplitMatchedGroup {
  transfers: Array<{ date: string; description: string; amount: number }>;
  order: {
    patient_id: string;
    product_code: string;
    amount: number;
  };
  totalAmount: number;
}

interface ReconcileResult {
  mode?: "order_based" | "statement_based";
  matched: MatchedItem[];
  splitMatched?: SplitMatchedGroup[];
  amountMismatch?: AmountMismatchItem[];
  unmatched: UnmatchedItem[];
  summary: {
    total: number;
    matched: number;
    splitMatched?: number;
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

interface BankStatement {
  id: number;
  transaction_date: string;
  description: string;
  deposit: number;
  withdrawal: number;
  balance: number | null;
  reconciled: boolean;
  matched_order_id: string | null;
  csv_filename: string;
  uploaded_at: string;
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
  status: string;
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
  // 分割振込の選択状態
  const [selectedSplits, setSelectedSplits] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  // 配送先情報フォーム フィルター
  const [pendingFilter, setPendingFilter] = useState<"pending_confirmation" | "confirmed" | "all">("pending_confirmation");
  // 入出金詳細
  const [stmtMonths, setStmtMonths] = useState<string[]>([]);
  const [stmtMonthData, setStmtMonthData] = useState<Record<string, { data: BankStatement[]; total: number; page: number; loading: boolean }>>({});
  const [stmtLoading, setStmtLoading] = useState(false);
  // 入出金詳細 フィルター
  const [stmtFilter, setStmtFilter] = useState<"all" | "reconciled" | "unreconciled">("unreconciled");
  // 手動紐づけ
  const [linkTarget, setLinkTarget] = useState<BankStatement | null>(null);
  const [linkTargets, setLinkTargets] = useState<BankStatement[]>([]); // 合算紐づけ用
  const [linkOrderId, setLinkOrderId] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinkedOrders, setUnlinkedOrders] = useState<Array<{
    id: string; patient_id: string; amount: number; account_name: string;
    shipping_name: string; product_code: string; created_at: string;
  }>>([]);
  const [loadingUnlinked, setLoadingUnlinked] = useState(false);
  // 入出金詳細の複数選択（合算紐づけ用）
  const [selectedStatements, setSelectedStatements] = useState<Set<number>>(new Set());

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

  const loadPendingOrders = async (status?: string) => {
    setLoadingPending(true);
    const filterStatus = status || pendingFilter;
    try {
      const params = new URLSearchParams();
      if (filterStatus === "all") {
        params.set("status", "all");
      } else {
        params.set("status", filterStatus);
      }
      const res = await fetch(`/api/admin/bank-transfer/pending?${params}`, {
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

  const loadStatementsForMonth = useCallback(async (month: string, page = 1, filter = "all") => {
    setStmtMonthData((prev) => ({
      ...prev,
      [month]: { ...(prev[month] || { data: [], total: 0, page: 1 }), loading: true },
    }));
    try {
      const params = new URLSearchParams({ month, page: String(page), limit: "50", filter });
      const res = await fetch(`/api/admin/bank-transfer/statements?${params}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setStmtMonthData((prev) => ({
        ...prev,
        [month]: {
          data: data.statements || [],
          total: data.total || 0,
          page,
          loading: false,
        },
      }));
    } catch {
      setStmtMonthData((prev) => ({
        ...prev,
        [month]: { ...(prev[month] || { data: [], total: 0, page: 1 }), loading: false },
      }));
    }
  }, []);

  const loadStatements = useCallback(async (filter = "unreconciled") => {
    setStmtLoading(true);
    try {
      // まず月一覧を取得
      const params = new URLSearchParams({ page: "1", limit: "50", filter });
      const res = await fetch(`/api/admin/bank-transfer/statements?${params}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const months: string[] = data.months || [];
      setStmtMonths(months);
      // 最新月のデータをセット
      if (months.length > 0) {
        setStmtMonthData((prev) => ({
          ...prev,
          [data.month]: {
            data: data.statements || [],
            total: data.total || 0,
            page: 1,
            loading: false,
          },
        }));
        // 残りの月もロード
        for (const m of months) {
          if (m !== data.month) {
            loadStatementsForMonth(m, 1, filter);
          }
        }
      }
    } catch {
      // サイレント
    } finally {
      setStmtLoading(false);
    }
  }, [loadStatementsForMonth]);

  // 初回ロード
  useEffect(() => {
    loadStatements();
  }, [loadStatements]);

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
      // CSVプレビュー後に入出金詳細を自動リロード
      loadStatements(stmtFilter);
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

    // matched + 選択された金額不一致項目 + 選択された分割振込項目を統合
    const selectedMismatchItems = (previewResult.amountMismatch || [])
      .filter((_, i) => selectedMismatches.has(i))
      .map((item) => ({
        transfer: item.transfer,
        order: item.order,
        newPaymentId: null,
        updateSuccess: false,
      }));
    const selectedSplitItems = (previewResult.splitMatched || [])
      .filter((_, i) => selectedSplits.has(i))
      .flatMap((group) =>
        group.transfers.map((t) => ({
          transfer: t,
          order: group.order,
          newPaymentId: null,
          updateSuccess: false,
        }))
      );
    const allMatches = [...previewResult.matched, ...selectedMismatchItems, ...selectedSplitItems];

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
      setSelectedSplits(new Set());
      loadPendingOrders(); // 配送先情報フォームを更新
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

      {/* 配送先情報フォーム */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">配送先情報フォーム</h2>
              <p className="text-sm text-slate-600 mt-1">銀行振込注文（{pendingOrders.length}件）</p>
            </div>
            <button
              onClick={() => loadPendingOrders()}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              更新
            </button>
          </div>
          <div className="flex gap-4 mt-3">
            {([
              { value: "pending_confirmation" as const, label: "未照合" },
              { value: "confirmed" as const, label: "照合済み" },
              { value: "all" as const, label: "全て" },
            ]).map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="pendingFilter"
                  checked={pendingFilter === opt.value}
                  onChange={() => {
                    setPendingFilter(opt.value);
                    loadPendingOrders(opt.value);
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          {loadingPending ? (
            <div className="p-8 text-center text-slate-500">読み込み中...</div>
          ) : pendingOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-500">該当する注文はありません</div>
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
                      {order.status === "pending_confirmation" ? (
                        <>
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
                        </>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          確認済み
                        </span>
                      )}
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

          {/* 分割振込セクション */}
          {previewResult.splitMatched && previewResult.splitMatched.length > 0 && (
            <div className="border-t border-purple-200">
              <div className="px-6 py-4 bg-purple-50">
                <h3 className="text-base font-semibold text-purple-900">
                  分割振込（{previewResult.splitMatched.length}件）
                </h3>
                <p className="text-sm text-purple-700 mt-1">
                  複数回の振込を合算すると注文金額と一致します。確認して反映する場合はチェックしてください
                </p>
              </div>
              <div className="divide-y divide-slate-200">
                {previewResult.splitMatched.map((group, gi) => (
                  <div key={gi} className="px-6 py-4 hover:bg-purple-50">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedSplits.has(gi)}
                        onChange={(e) => {
                          const next = new Set(selectedSplits);
                          if (e.target.checked) {
                            next.add(gi);
                          } else {
                            next.delete(gi);
                          }
                          setSelectedSplits(next);
                        }}
                        className="w-4 h-4 mt-1 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-slate-900">
                            注文金額: ¥{group.order.amount.toLocaleString()}
                          </span>
                          <span className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                            合算一致
                          </span>
                          <button
                            onClick={() => window.open(`/admin/line/talk?pid=${group.order.patient_id}`, '_blank')}
                            className="text-xs text-blue-600 hover:underline font-mono"
                          >
                            {group.order.patient_id}
                          </button>
                        </div>
                        <div className="space-y-1">
                          {group.transfers.map((t, ti) => (
                            <div key={ti} className="flex items-center gap-4 text-sm">
                              <span className="text-slate-500 w-24">{t.date}</span>
                              <span className="text-slate-700 flex-1">{t.description}</span>
                              <span className="font-medium text-green-700">¥{t.amount.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex items-center gap-4 text-sm pt-1 border-t border-slate-100">
                            <span className="text-slate-500 w-24">合計</span>
                            <span className="flex-1" />
                            <span className="font-bold text-purple-700">
                              ¥{group.totalAmount.toLocaleString()}
                              {group.totalAmount === group.order.amount && " = 注文金額"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                                status: "pending_confirmation",
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

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              マッチ: <span className="font-semibold text-green-600">{previewResult.matched.length}件</span>
              {(previewResult.splitMatched?.length ?? 0) > 0 && (
                <span className="ml-4">
                  分割振込: <span className="font-semibold text-purple-600">
                    {previewResult.splitMatched!.length}件
                    {selectedSplits.size > 0 && `（${selectedSplits.size}件選択中）`}
                  </span>
                </span>
              )}
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
                  未マッチ: <span className="font-semibold text-slate-500">{previewResult.unmatched.length}件</span>
                  <span className="text-xs text-slate-400 ml-1">（入出金詳細で確認）</span>
                </span>
              )}
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming || (previewResult.matched.length === 0 && selectedMismatches.size === 0 && selectedSplits.size === 0)}
              className={`px-6 py-3 rounded-lg font-medium ${
                confirming || (previewResult.matched.length === 0 && selectedMismatches.size === 0 && selectedSplits.size === 0)
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {confirming ? "反映中..." : `このデータを反映する（${previewResult.matched.length + selectedMismatches.size + selectedSplits.size}件）`}
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
            <div className="bg-white rounded-lg shadow overflow-hidden p-4">
              <p className="text-sm text-slate-600">
                未マッチ {result.unmatched.length}件は入出金詳細で確認・紐づけできます
              </p>
            </div>
          )}
        </div>
      )}

      {/* 入出金詳細セクション */}
      {stmtMonths.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">入出金詳細</h2>
                <p className="text-sm text-slate-600 mt-1">CSVから取り込んだ入出金明細</p>
              </div>
            </div>
            <div className="flex gap-4 mt-3">
              {([
                { value: "unreconciled" as const, label: "未照合" },
                { value: "reconciled" as const, label: "照合済み" },
                { value: "all" as const, label: "全て" },
              ]).map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="stmtFilter"
                    checked={stmtFilter === opt.value}
                    onChange={() => {
                      setStmtFilter(opt.value);
                      setStmtMonthData({});
                      loadStatements(opt.value);
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 各月の明細 */}
          {stmtMonths.map((m, i) => {
            const monthInfo = stmtMonthData[m];
            const monthLabel = (() => {
              const [y, mo] = m.split("-");
              return i === 0 ? `${parseInt(mo)}月（最新）` : `${y}年${parseInt(mo)}月`;
            })();
            return (
              <div key={m} className="border-t border-slate-200">
                <div className="px-6 py-3 bg-slate-50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    {monthLabel}
                    {monthInfo && <span className="ml-2 text-xs font-normal text-slate-500">（{monthInfo.total}件）</span>}
                  </h3>
                  {monthInfo && (() => {
                    const monthSelectedIds = monthInfo.data.filter((s) => selectedStatements.has(s.id)).map((s) => s.id);
                    if (monthSelectedIds.length < 2) return null;
                    const selectedItems = monthInfo.data.filter((s) => selectedStatements.has(s.id));
                    const totalDeposit = selectedItems.reduce((sum, s) => sum + s.deposit, 0);
                    return (
                      <button
                        onClick={async () => {
                          setLinkTarget(null);
                          setLinkTargets(selectedItems);
                          setLinkOrderId("");
                          setLoadingUnlinked(true);
                          try {
                            const res = await fetch("/api/admin/bank-transfer/statements/unlinked-orders", { credentials: "include" });
                            if (res.ok) {
                              const data = await res.json();
                              setUnlinkedOrders(data.orders || []);
                            }
                          } catch { /* */ } finally {
                            setLoadingUnlinked(false);
                          }
                        }}
                        className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        選択した{monthSelectedIds.length}件を合算紐づけ（¥{totalDeposit.toLocaleString()}）
                      </button>
                    );
                  })()}
                </div>
                {!monthInfo || monthInfo.loading ? (
                  <div className="p-6 text-center text-slate-500 text-sm">読み込み中...</div>
                ) : monthInfo.data.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">該当する明細がありません</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-2 py-3 text-center text-xs font-medium text-slate-500 uppercase w-10"></th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">日付</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">摘要</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">入金</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">出金</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">照合</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {monthInfo.data.map((s) => (
                            <tr key={s.id} className={`hover:bg-slate-50 ${selectedStatements.has(s.id) ? "bg-purple-50" : ""}`}>
                              <td className="px-2 py-3 text-center">
                                {s.deposit > 0 && !s.reconciled && (
                                  <input
                                    type="checkbox"
                                    checked={selectedStatements.has(s.id)}
                                    onChange={(e) => {
                                      const next = new Set(selectedStatements);
                                      if (e.target.checked) {
                                        next.add(s.id);
                                      } else {
                                        next.delete(s.id);
                                      }
                                      setSelectedStatements(next);
                                    }}
                                    className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                  />
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                                <div>{s.transaction_date}</div>
                                {s.uploaded_at && (
                                  <div className="text-xs text-slate-400">
                                    {new Date(s.uploaded_at).toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 取込
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-900 max-w-xs truncate">
                                {s.description}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-700">
                                {s.deposit > 0 ? `¥${s.deposit.toLocaleString()}` : ""}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-red-600">
                                {s.withdrawal > 0 ? `¥${s.withdrawal.toLocaleString()}` : ""}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {s.deposit > 0 ? (
                                  s.reconciled ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      済
                                    </span>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        setLinkTarget(s);
                                        setLinkTargets([]);
                                        setLinkOrderId("");
                                        setLoadingUnlinked(true);
                                        try {
                                          const res = await fetch("/api/admin/bank-transfer/statements/unlinked-orders", { credentials: "include" });
                                          if (res.ok) {
                                            const data = await res.json();
                                            setUnlinkedOrders(data.orders || []);
                                          }
                                        } catch { /* */ } finally {
                                          setLoadingUnlinked(false);
                                        }
                                      }}
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer"
                                    >
                                      未 → 紐づけ
                                    </button>
                                  )
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ページネーション */}
                    {monthInfo.total > 50 && (
                      <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-sm text-slate-600">
                          {monthInfo.total}件中 {(monthInfo.page - 1) * 50 + 1}〜{Math.min(monthInfo.page * 50, monthInfo.total)}件
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => loadStatementsForMonth(m, monthInfo.page - 1, stmtFilter)}
                            disabled={monthInfo.page <= 1}
                            className="px-3 py-1 text-sm rounded border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                          >
                            前へ
                          </button>
                          <span className="px-3 py-1 text-sm text-slate-600">
                            {monthInfo.page} / {Math.ceil(monthInfo.total / 50)}
                          </span>
                          <button
                            onClick={() => loadStatementsForMonth(m, monthInfo.page + 1, stmtFilter)}
                            disabled={monthInfo.page * 50 >= monthInfo.total}
                            className="px-3 py-1 text-sm rounded border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                          >
                            次へ
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
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

      {/* 手動紐づけモーダル（単体 or 合算） */}
      {(linkTarget || linkTargets.length > 0) && (() => {
        const isMulti = linkTargets.length > 0;
        const targets = isMulti ? linkTargets : (linkTarget ? [linkTarget] : []);
        const totalDeposit = targets.reduce((sum, t) => sum + t.deposit, 0);

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">
                  {isMulti ? `入金を合算して注文に紐づけ（${targets.length}件）` : "入金を注文に紐づけ"}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {isMulti ? "選択した入金の合算額に対応する注文を選択してください" : "この入金に対応する注文を選択してください"}
                </p>
              </div>
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                <div className={`rounded p-4 space-y-2 ${isMulti ? "bg-purple-50" : "bg-blue-50"}`}>
                  {targets.map((t, ti) => (
                    <div key={t.id} className={`${ti > 0 ? "pt-2 border-t border-purple-200" : ""}`}>
                      <div className="flex justify-between text-sm">
                        <span className={isMulti ? "text-purple-700" : "text-blue-700"}>取引日:</span>
                        <span className={`font-medium ${isMulti ? "text-purple-900" : "text-blue-900"}`}>{t.transaction_date}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={isMulti ? "text-purple-700" : "text-blue-700"}>摘要:</span>
                        <span className={`font-medium ${isMulti ? "text-purple-900" : "text-blue-900"}`}>{t.description}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={isMulti ? "text-purple-700" : "text-blue-700"}>入金額:</span>
                        <span className="font-bold text-green-700">¥{t.deposit.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {isMulti && (
                    <div className="pt-2 border-t border-purple-300 flex justify-between text-sm">
                      <span className="text-purple-700 font-semibold">合計:</span>
                      <span className="font-bold text-purple-700">¥{totalDeposit.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {loadingUnlinked ? (
                  <div className="text-center py-4 text-slate-500">注文一覧を読み込み中...</div>
                ) : unlinkedOrders.length === 0 ? (
                  <div className="text-center py-4 text-slate-500">紐づけ可能な注文がありません</div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      未照合の注文（{unlinkedOrders.length}件）
                    </p>
                    {unlinkedOrders.map((order) => {
                      const isSelected = linkOrderId === order.id;
                      const amountMatch = order.amount === totalDeposit;
                      return (
                        <button
                          key={order.id}
                          onClick={() => setLinkOrderId(order.id)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : amountMatch
                              ? "border-green-300 bg-green-50 hover:border-green-400"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? "border-blue-500 bg-blue-500" : "border-slate-300"
                              }`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {order.id}
                                  {amountMatch && <span className="ml-2 text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded">金額一致</span>}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {order.shipping_name || order.account_name || order.patient_id}
                                  {order.account_name && <span className="ml-1">（{order.account_name}）</span>}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-medium ${amountMatch ? "text-green-700" : "text-slate-900"}`}>
                                ¥{order.amount.toLocaleString()}
                              </div>
                              <div className="text-xs text-slate-400">
                                {new Date(order.created_at).toLocaleDateString("ja-JP")}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => { setLinkTarget(null); setLinkTargets([]); }}
                  className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                  disabled={linking}
                >
                  キャンセル
                </button>
                <button
                  onClick={async () => {
                    if (!linkOrderId.trim()) return;
                    setLinking(true);
                    try {
                      const ids = targets.map((t) => t.id);
                      const res = await fetch("/api/admin/bank-transfer/statements/link", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ statementIds: ids, orderId: linkOrderId.trim() }),
                      });
                      if (!res.ok) {
                        const d = await res.json();
                        throw new Error(d.message || d.error || "紐づけに失敗しました");
                      }
                      setLinkTarget(null);
                      setLinkTargets([]);
                      setSelectedStatements(new Set());
                      loadStatements(stmtFilter);
                      loadPendingOrders();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "紐づけに失敗しました");
                    } finally {
                      setLinking(false);
                    }
                  }}
                  disabled={linking || !linkOrderId.trim()}
                  className={`px-4 py-2 text-sm rounded-lg font-medium ${
                    linking || !linkOrderId.trim()
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : isMulti ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {linking ? "処理中..." : isMulti ? `${targets.length}件を合算紐づけ` : "紐づけて照合済みにする"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
