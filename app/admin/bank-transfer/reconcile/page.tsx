"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import type {
  ReconcileResult,
  BankStatement,
  PendingOrder,
  Product,
  UnlinkedOrder,
} from "./_components/types";
import {
  CsvUploader,
  MatchedTable,
  SplitMatchedTable,
  AmountMismatchTable,
  UnmatchedTable,
  ReconcileSummary,
  ManualConfirmModal,
  LinkModal,
  ProductChangeModal,
  PendingOrdersTable,
  StatementsSection,
} from "./_components";

export default function BankTransferReconcilePage() {
  // --- CSV・照合関連 ---
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [error, setError] = useState("");
  const [previewResult, setPreviewResult] = useState<ReconcileResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [csvFormat, setCsvFormat] = useState<"gmo" | "paypay">("paypay");
  const [selectedMismatches, setSelectedMismatches] = useState<Set<number>>(new Set());
  const [selectedSplits, setSelectedSplits] = useState<Set<number>>(new Set());

  // --- 配送先情報フォーム ---
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [pendingFilter, setPendingFilter] = useState<"pending_confirmation" | "confirmed" | "all">("pending_confirmation");

  // --- 手動確認モーダル ---
  const [manualConfirmOrder, setManualConfirmOrder] = useState<PendingOrder | null>(null);
  const [manualConfirmMemo, setManualConfirmMemo] = useState("");
  const [manualConfirming, setManualConfirming] = useState(false);

  // --- 商品変更モーダル ---
  const [changeProductOrder, setChangeProductOrder] = useState<PendingOrder | null>(null);
  const [newProductCode, setNewProductCode] = useState("");
  const [changeProductMemo, setChangeProductMemo] = useState("");
  const [changingProduct, setChangingProduct] = useState(false);

  // --- 入出金詳細 ---
  const [stmtMonths, setStmtMonths] = useState<string[]>([]);
  const [stmtMonthData, setStmtMonthData] = useState<Record<string, { data: BankStatement[]; total: number; page: number; loading: boolean }>>({});
  const [stmtLoading, setStmtLoading] = useState(false);
  const [stmtFilter, setStmtFilter] = useState<"all" | "reconciled" | "unreconciled">("unreconciled");
  const [selectedStatements, setSelectedStatements] = useState<Set<number>>(new Set());

  // --- 手動紐づけモーダル ---
  const [linkTarget, setLinkTarget] = useState<BankStatement | null>(null);
  const [linkTargets, setLinkTargets] = useState<BankStatement[]>([]);
  const [linkOrderId, setLinkOrderId] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinkedOrders, setUnlinkedOrders] = useState<UnlinkedOrder[]>([]);
  const [loadingUnlinked, setLoadingUnlinked] = useState(false);

  // --- SWR ---
  const { data: productsData } = useSWR<{ products: Array<{ code: string; title: string; price: number }> }>("/api/admin/products");
  const products: Product[] = (productsData?.products ?? []).map((p) => ({ code: p.code, title: p.title, price: p.price }));

  const { data: settingsData } = useSWR<{ settings: { reconcile_mode?: string } }>("/api/admin/settings?category=payment");
  const [reconcileMode, setReconcileMode] = useState<"order_based" | "statement_based">("order_based");
  const [reconcileModeInitialized, setReconcileModeInitialized] = useState(false);

  useEffect(() => {
    if (settingsData?.settings?.reconcile_mode && !reconcileModeInitialized) {
      setReconcileMode(settingsData.settings.reconcile_mode as "order_based" | "statement_based");
      setReconcileModeInitialized(true);
    }
  }, [settingsData, reconcileModeInitialized]);

  // --- データ取得関数 ---

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
      const res = await fetch(`/api/admin/bank-transfer/pending?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(`データ取得失敗 (${res.status})`);
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
        [month]: { data: data.statements || [], total: data.total || 0, page, loading: false },
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
      const params = new URLSearchParams({ page: "1", limit: "50", filter });
      const res = await fetch(`/api/admin/bank-transfer/statements?${params}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const months: string[] = data.months || [];
      setStmtMonths(months);
      if (months.length > 0) {
        setStmtMonthData((prev) => ({
          ...prev,
          [data.month]: { data: data.statements || [], total: data.total || 0, page: 1, loading: false },
        }));
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

  // --- 未照合注文の取得（紐づけモーダル用） ---
  const fetchUnlinkedOrders = async () => {
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
  };

  // --- 初回ロード ---
  useEffect(() => {
    loadPendingOrders();
  }, []);

  useEffect(() => {
    loadStatements();
  }, [loadStatements]);

  // --- CSV照合ハンドラー ---

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setError("");
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
      if (data.mode) setReconcileMode(data.mode);
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
        headers: { "Content-Type": "application/json" },
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
      loadPendingOrders();
    } catch (err) {
      console.error("Confirm error:", err);
      setError(err instanceof Error ? err.message : "照合確定に失敗しました");
    } finally {
      setConfirming(false);
    }
  };

  // --- 手動確認 ---
  const handleManualConfirm = async () => {
    if (!manualConfirmOrder) return;
    setManualConfirming(true);
    setError("");
    try {
      const res = await fetch("/api/admin/bank-transfer/manual-confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: manualConfirmOrder.id, memo: manualConfirmMemo }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error((errorData.message || errorData.error) || `エラー (${res.status})`);
      }
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

  // --- 商品変更 ---
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

  // --- 手動紐づけ ---
  const handleLink = async () => {
    if (!linkOrderId.trim()) return;
    setLinking(true);
    const targets = linkTargets.length > 0 ? linkTargets : (linkTarget ? [linkTarget] : []);
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
  };

  // --- 紐づけモーダルを開く ---
  const openLinkSingle = (statement: BankStatement) => {
    setLinkTarget(statement);
    setLinkTargets([]);
    setLinkOrderId("");
    fetchUnlinkedOrders();
  };

  const openLinkMulti = (statements: BankStatement[]) => {
    setLinkTarget(null);
    setLinkTargets(statements);
    setLinkOrderId("");
    fetchUnlinkedOrders();
  };

  // --- 商品変更モーダルを開く ---
  const openChangeProduct = (order: PendingOrder) => {
    setChangeProductOrder(order);
    setNewProductCode("");
    setChangeProductMemo("");
  };

  // --- 手動確認モーダルを開く ---
  const openManualConfirm = (order: PendingOrder) => {
    setManualConfirmOrder(order);
    setManualConfirmMemo("");
  };

  return (
    <div className="p-6">
      {/* ヘッダー */}
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
      <PendingOrdersTable
        orders={pendingOrders}
        loading={loadingPending}
        filter={pendingFilter}
        onFilterChange={(f) => { setPendingFilter(f); loadPendingOrders(f); }}
        onRefresh={() => loadPendingOrders()}
        onManualConfirm={openManualConfirm}
        onChangeProduct={openChangeProduct}
      />

      {/* CSVアップロード */}
      <CsvUploader
        file={file}
        loading={loading}
        csvFormat={csvFormat}
        onFileChange={handleFileChange}
        onCsvFormatChange={setCsvFormat}
        onPreview={handlePreview}
        fileInputKey={fileInputKey}
      />

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">エラー</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* 照合確認プレビュー */}
      {previewResult && (
        <div className="mb-6 bg-white rounded-lg shadow">
          <div className="px-6 py-4 bg-green-50 border-b border-green-200">
            <h2 className="text-lg font-semibold text-green-900">2. データ確認</h2>
            <p className="text-sm text-green-700 mt-1">
              照合候補 {previewResult.matched.length}件を表示します。問題なければ「このデータを反映する」ボタンを押してください。
            </p>
          </div>

          {/* 完全マッチ */}
          <MatchedTable items={previewResult.matched} />

          {/* 分割振込 */}
          {previewResult.splitMatched && previewResult.splitMatched.length > 0 && (
            <SplitMatchedTable
              items={previewResult.splitMatched}
              selectedSplits={selectedSplits}
              onSelectedSplitsChange={setSelectedSplits}
            />
          )}

          {/* 金額不一致 */}
          {previewResult.amountMismatch && previewResult.amountMismatch.length > 0 && (
            <AmountMismatchTable
              items={previewResult.amountMismatch}
              selectedMismatches={selectedMismatches}
              onSelectedMismatchesChange={setSelectedMismatches}
              onChangeProduct={openChangeProduct}
            />
          )}

          {/* フッター（サマリー + 確定ボタン） */}
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

          {/* デバッグ情報 */}
          {previewResult.debug && (
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-300">
              <details>
                <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                  照合デバッグ情報（クリックで表示）
                </summary>
                <div className="mt-4 space-y-4">
                  <div className="bg-white rounded p-4">
                    <h4 className="font-semibold text-sm text-slate-700 mb-2">全体統計</h4>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>CSVの振込データ: {previewResult.debug.totalTransfers}件</p>
                      <p>未照合の注文: {previewResult.debug.totalPendingOrders}件</p>
                    </div>
                  </div>
                  <div className="bg-white rounded p-4">
                    <h4 className="font-semibold text-sm text-slate-700 mb-2">CSVデータサンプル（最初の5件）</h4>
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
                    <h4 className="font-semibold text-sm text-slate-700 mb-2">未照合注文サンプル（最初の5件）</h4>
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

      {/* 照合確定結果 */}
      {result && (
        <div className="space-y-6">
          <ReconcileSummary result={result} />
          <MatchedTable items={result.matched} showResult />
          <UnmatchedTable count={result.unmatched.length} />
        </div>
      )}

      {/* 入出金詳細 */}
      <StatementsSection
        months={stmtMonths}
        monthData={stmtMonthData}
        filter={stmtFilter}
        selectedStatements={selectedStatements}
        onFilterChange={(f) => { setStmtFilter(f); setStmtMonthData({}); loadStatements(f); }}
        onPageChange={(month, page) => loadStatementsForMonth(month, page, stmtFilter)}
        onSelectedStatementsChange={setSelectedStatements}
        onLinkSingle={openLinkSingle}
        onLinkMulti={openLinkMulti}
      />

      {/* 手動確認モーダル */}
      {manualConfirmOrder && (
        <ManualConfirmModal
          order={manualConfirmOrder}
          memo={manualConfirmMemo}
          confirming={manualConfirming}
          onMemoChange={setManualConfirmMemo}
          onConfirm={handleManualConfirm}
          onClose={() => { setManualConfirmOrder(null); setManualConfirmMemo(""); }}
        />
      )}

      {/* 手動紐づけモーダル */}
      {(linkTarget || linkTargets.length > 0) && (
        <LinkModal
          linkTarget={linkTarget}
          linkTargets={linkTargets}
          linkOrderId={linkOrderId}
          linking={linking}
          loadingUnlinked={loadingUnlinked}
          unlinkedOrders={unlinkedOrders}
          onLinkOrderIdChange={setLinkOrderId}
          onLink={handleLink}
          onClose={() => { setLinkTarget(null); setLinkTargets([]); }}
        />
      )}

      {/* 商品変更モーダル */}
      {changeProductOrder && (
        <ProductChangeModal
          order={changeProductOrder}
          products={products}
          newProductCode={newProductCode}
          memo={changeProductMemo}
          changing={changingProduct}
          onNewProductCodeChange={setNewProductCode}
          onMemoChange={setChangeProductMemo}
          onChangeProduct={handleChangeProduct}
          onClose={() => { setChangeProductOrder(null); setNewProductCode(""); setChangeProductMemo(""); }}
        />
      )}
    </div>
  );
}
