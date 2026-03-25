// 商品CSVインポートモーダル（Square商品リストCSV対応）
"use client";

import { useState, useRef, useCallback } from "react";
import { parseSquareCsv, type ParsedProduct, type ParseError } from "@/lib/square-csv-parser";
import type { Product } from "./types";

type Step = "upload" | "preview" | "importing" | "result";
type DuplicateStrategy = "skip" | "overwrite";

type Props = {
  isOpen: boolean;
  existingProducts: Product[];
  onComplete: () => void;
  onClose: () => void;
};

type ImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ code: string; message: string }>;
  total: number;
};

export function CsvImportModal({ isOpen, existingProducts, onComplete, onClose }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("skip");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 既存商品のcodeセット
  const existingCodes = new Set(existingProducts.map((p) => p.code));

  // 重複チェック
  const duplicateProducts = products.filter((p) => existingCodes.has(p.code));
  const newProducts = products.filter((p) => !existingCodes.has(p.code));

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setProducts([]);
    setParseErrors([]);
    setTotalRows(0);
    setDuplicateStrategy("skip");
    setResult(null);
    setError(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  // ファイル読み込み＋パース
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);

    try {
      const text = await readFileAsText(selected);
      const result = parseSquareCsv(text);

      if (!result.headerDetected) {
        setError(result.errors[0]?.message || "CSVのヘッダーを検出できません");
        return;
      }

      setProducts(result.products);
      setParseErrors(result.errors);
      setTotalRows(result.totalRows);
      setStep("preview");
    } catch (err) {
      setError(`ファイル読み込みエラー: ${err instanceof Error ? err.message : "不明"}`);
    }
  };

  // インポート実行
  const handleImport = async () => {
    setStep("importing");
    setError(null);

    try {
      const res = await fetch("/api/admin/products/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          products: products.map((p) => ({
            code: p.code,
            title: p.title,
            price: p.price,
            category: p.category,
            description: p.description,
          })),
          duplicateStrategy,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API エラー: ${res.status} ${errText}`);
      }

      const data: ImportResult = await res.json();
      setResult(data);
      setStep("result");
    } catch (err) {
      setError(`インポート失敗: ${err instanceof Error ? err.message : "不明"}`);
      setStep("preview");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* モーダル本体 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">商品CSVインポート</h2>
            <p className="text-sm text-slate-500">
              {step === "upload" && "Squareの商品リストCSVをアップロード"}
              {step === "preview" && `${products.length}件の商品をプレビュー中`}
              {step === "importing" && "インポート中..."}
              {step === "result" && "インポート完了"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: ファイル選択 */}
          {step === "upload" && (
            <div>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <svg className="w-12 h-12 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-slate-600 mb-2">Squareの商品リストCSVを選択してください</p>
                <p className="text-xs text-slate-400 mb-4">
                  Squareダッシュボード → 商品 → エクスポートで取得できるCSV
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  CSVファイルを選択
                </button>
                {file && (
                  <p className="mt-3 text-sm text-slate-600">
                    選択中: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <h3 className="text-sm font-medium text-slate-700 mb-2">対応カラム</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>商品名 → 商品タイトル</div>
                  <div>SKU → 商品コード</div>
                  <div>価格 → 価格</div>
                  <div>カテゴリ → カテゴリ</div>
                  <div>説明 → 商品説明</div>
                  <div>バリエーション名 → タイトルに付加</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: プレビュー */}
          {step === "preview" && (
            <div>
              {/* サマリー */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{products.length}</div>
                  <div className="text-xs text-blue-600">有効</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{newProducts.length}</div>
                  <div className="text-xs text-green-600">新規</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-700">{duplicateProducts.length}</div>
                  <div className="text-xs text-amber-600">重複</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{parseErrors.length}</div>
                  <div className="text-xs text-red-600">エラー</div>
                </div>
              </div>

              {/* 重複処理方針 */}
              {duplicateProducts.length > 0 && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 mb-2">
                    {duplicateProducts.length}件の商品コードが既存商品と重複しています
                  </p>
                  <div className="flex gap-3">
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      duplicateStrategy === "skip" ? "border-blue-500 bg-white" : "border-slate-200"
                    }`}>
                      <input
                        type="radio"
                        name="strategy"
                        checked={duplicateStrategy === "skip"}
                        onChange={() => setDuplicateStrategy("skip")}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-900">スキップ</span>
                        <p className="text-xs text-slate-500">重複する商品は無視して新規のみ追加</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      duplicateStrategy === "overwrite" ? "border-blue-500 bg-white" : "border-slate-200"
                    }`}>
                      <input
                        type="radio"
                        name="strategy"
                        checked={duplicateStrategy === "overwrite"}
                        onChange={() => setDuplicateStrategy("overwrite")}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-900">上書き</span>
                        <p className="text-xs text-slate-500">重複する商品の名前・価格等を更新</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* エラー行 */}
              {parseErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    {parseErrors.length}件のエラー行（インポート対象外）
                  </p>
                  <div className="max-h-24 overflow-y-auto text-xs text-red-700 space-y-1">
                    {parseErrors.slice(0, 10).map((e, i) => (
                      <div key={i}>行{e.row}: {e.message}</div>
                    ))}
                    {parseErrors.length > 10 && (
                      <div>...他 {parseErrors.length - 10}件</div>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* プレビューテーブル */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">状態</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">商品名</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">コード</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">価格</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">カテゴリ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((p, i) => {
                        const isDuplicate = existingCodes.has(p.code);
                        return (
                          <tr key={i} className={isDuplicate ? "bg-amber-50/50" : ""}>
                            <td className="px-3 py-2">
                              {isDuplicate ? (
                                <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">重複</span>
                              ) : (
                                <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700">新規</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-900 max-w-[200px] truncate">{p.title}</td>
                            <td className="px-3 py-2 text-slate-600 font-mono text-xs">{p.code}</td>
                            <td className="px-3 py-2 text-right text-slate-900">{p.price.toLocaleString()}円</td>
                            <td className="px-3 py-2 text-slate-600">{p.category || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: インポート中 */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-4" />
              <p className="text-slate-600">インポート中...</p>
              <p className="text-sm text-slate-400 mt-1">{products.length}件を処理しています</p>
            </div>
          )}

          {/* Step 4: 結果 */}
          {step === "result" && result && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">インポート完了</h3>
                  <p className="text-sm text-slate-500">処理が正常に完了しました</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{result.imported}</div>
                  <div className="text-xs text-green-600">新規追加</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{result.updated}</div>
                  <div className="text-xs text-blue-600">上書き更新</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-slate-700">{result.skipped}</div>
                  <div className="text-xs text-slate-600">スキップ</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
                  <div className="text-xs text-red-600">エラー</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">エラー詳細</p>
                  <div className="text-xs text-red-700 space-y-1">
                    {result.errors.map((e, i) => (
                      <div key={i}>{e.code}: {e.message}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-400">
            {step === "preview" && `${totalRows}行中 ${products.length}件が有効`}
          </div>
          <div className="flex items-center gap-3">
            {step === "upload" && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                キャンセル
              </button>
            )}
            {step === "preview" && (
              <>
                <button
                  onClick={reset}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  戻る
                </button>
                <button
                  onClick={handleImport}
                  disabled={products.length === 0}
                  className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                    products.length === 0
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {duplicateStrategy === "overwrite" && duplicateProducts.length > 0
                    ? `${newProducts.length}件追加 + ${duplicateProducts.length}件上書き`
                    : `${newProducts.length}件をインポート`
                  }
                </button>
              </>
            )}
            {step === "result" && (
              <button
                onClick={() => { onComplete(); handleClose(); }}
                className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                閉じる
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FileをテキストとしてUTF-8で読み込む（Shift_JISフォールバック付き）
 */
async function readFileAsText(file: File): Promise<string> {
  // まずUTF-8で試行
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  try {
    return utf8.decode(buffer);
  } catch {
    // UTF-8デコード失敗 → Shift_JISで再試行
    const sjis = new TextDecoder("shift_jis");
    return sjis.decode(buffer);
  }
}
