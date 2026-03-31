"use client";
// SALON: HotPepper連携 — SALON BOARD CSVインポート

import { useState, useCallback, useRef } from "react";

interface ImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  total: number;
}

/** CSVテキストから先頭5行をプレビュー用に取得 */
function previewCsvRows(text: string, maxRows = 5): string[][] {
  // BOM除去
  let t = text;
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  const lines = t.split(/\r?\n/).filter((l) => l.trim());
  const rows: string[][] = [];
  for (let i = 0; i < Math.min(lines.length, maxRows + 1); i++) {
    // 簡易split（プレビュー用なのでクォート対応は最低限）
    rows.push(lines[i].split(",").map((f) => f.replace(/^"|"$/g, "").trim()));
  }
  return rows;
}

const EXPECTED_HEADERS = [
  "予約日",
  "開始時刻",
  "終了時刻",
  "お客様名",
  "電話番号",
  "メニュー名",
  "スタッフ名",
  "金額",
  "ステータス",
  "備考",
];

export default function HotpepperPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイル読み込み処理
  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    try {
      const text = await f.text();
      const rows = previewCsvRows(text);
      setPreview(rows);
    } catch {
      setPreview(null);
    }
  }, []);

  // ドラッグ&ドロップ
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f && f.name.endsWith(".csv")) handleFile(f);
    },
    [handleFile],
  );

  // ファイル選択
  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  // インポート実行
  const handleImport = useCallback(async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/hotpepper/import-csv", {
        method: "POST",
        body: formData,
      });
      const json: ImportResult = await res.json();
      setResult(json);
    } catch (e) {
      setResult({
        ok: false,
        imported: 0,
        skipped: 0,
        errors: [e instanceof Error ? e.message : "通信エラー"],
        total: 0,
      });
    } finally {
      setImporting(false);
    }
  }, [file]);

  // リセット
  const handleReset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          HotPepper連携 — CSVインポート
        </h1>
      </div>

      {/* 説明カード */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          SALON BOARDからCSVをエクスポートする手順
        </h2>
        <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1.5">
          <li>SALON BOARDにログイン</li>
          <li>
            「予約管理」→「予約一覧」を開く
          </li>
          <li>対象期間を指定してCSVエクスポート</li>
          <li>ダウンロードしたCSVファイルを下のエリアにアップロード</li>
        </ol>
        <div className="mt-3 px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
          <p className="text-xs text-purple-700">
            想定カラム順: {EXPECTED_HEADERS.join(", ")}
          </p>
        </div>
      </div>

      {/* アップロードエリア */}
      <div
        className={`bg-white rounded-xl shadow-sm border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-purple-400 bg-purple-50"
            : "border-slate-300 hover:border-purple-300"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFileChange}
        />
        <div className="text-4xl mb-3">📄</div>
        {file ? (
          <div>
            <p className="text-sm font-medium text-slate-700">{file.name}</p>
            <p className="text-xs text-slate-400 mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-slate-600">
              CSVファイルをドラッグ&ドロップ
            </p>
            <p className="text-xs text-slate-400 mt-1">
              またはクリックしてファイルを選択
            </p>
          </div>
        )}
      </div>

      {/* プレビュー */}
      {preview && preview.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            プレビュー（先頭{Math.min(preview.length - 1, 5)}行）
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  {preview[0].map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-medium text-slate-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-t border-slate-100">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-2 text-slate-600 whitespace-nowrap"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ボタン群 */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {importing ? "インポート中..." : "インポート開始"}
            </button>
            <button
              onClick={handleReset}
              disabled={importing}
              className="px-5 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              リセット
            </button>
          </div>
        </div>
      )}

      {/* インポート結果 */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            インポート結果
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {result.imported}
              </p>
              <p className="text-xs text-green-700 mt-1">成功</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {result.skipped}
              </p>
              <p className="text-xs text-yellow-700 mt-1">スキップ</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-600">
                {result.total}
              </p>
              <p className="text-xs text-slate-500 mt-1">合計</p>
            </div>
          </div>

          {/* エラー詳細 */}
          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-red-600 mb-2">
                エラー詳細（{result.errors.length}件）
              </p>
              <div className="max-h-48 overflow-y-auto bg-red-50 rounded-lg p-3 space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700">
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
