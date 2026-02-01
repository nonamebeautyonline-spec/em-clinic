"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UpdateResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function UpdateTrackingPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("CSVファイルを選択してください");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError("");
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("ファイルを選択してください");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    try {
      const text = await file.text();

      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/shipping/update-tracking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ csvContent: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "アップロードに失敗しました");
      }

      setResult(data);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">追跡番号付与</h1>
        <p className="text-slate-600 text-sm mt-1">
          ヤマトCSVから追跡番号を一括付与
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">CSVアップロード</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ヤマトB2エクスポートCSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {file && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-700">
                選択ファイル: <span className="font-mono font-semibold">{file.name}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                サイズ: {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`w-full py-3 px-4 rounded-lg font-medium ${
              !file || uploading
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {uploading ? "アップロード中..." : "追跡番号を付与"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">✅ 更新完了</h3>
            <div className="text-sm text-green-800 space-y-1">
              <p>成功: {result.success}件</p>
              {result.failed > 0 && (
                <>
                  <p className="text-red-700">失敗: {result.failed}件</p>
                  {result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">エラー詳細:</p>
                      <ul className="list-disc list-inside mt-1 text-xs">
                        {result.errors.slice(0, 10).map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                        {result.errors.length > 10 && (
                          <li>...他 {result.errors.length - 10}件</li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">📝 CSVフォーマット</h3>
          <p className="text-xs text-slate-600 mb-2">
            ヤマトB2のエクスポートCSVをそのままアップロードしてください。
          </p>
          <p className="text-xs text-slate-600">
            必須カラム: お客様管理番号（payment_id）、送り状番号（追跡番号）
          </p>
        </div>
      </div>
    </div>
  );
}
