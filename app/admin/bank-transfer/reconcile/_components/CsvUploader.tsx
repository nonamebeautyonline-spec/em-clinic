// CSVファイルアップロードUI
"use client";

import { useRef, useState } from "react";

interface CsvUploaderProps {
  file: File | null;
  loading: boolean;
  csvFormat: "gmo" | "paypay";
  onFileChange: (file: File) => void;
  onCsvFormatChange: (format: "gmo" | "paypay") => void;
  onPreview: () => void;
  fileInputKey: number;
}

export default function CsvUploader({
  file,
  loading,
  csvFormat,
  onFileChange,
  onCsvFormatChange,
  onPreview,
  fileInputKey,
}: CsvUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);

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
      onFileChange(selectedFile);
    }
  };

  return (
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
              onChange={() => onCsvFormatChange("paypay")}
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
              onChange={() => onCsvFormatChange("gmo")}
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
        onClick={onPreview}
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
  );
}
