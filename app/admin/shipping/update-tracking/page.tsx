"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TrackingUpdate {
  paymentId: string;
  trackingNumber: string;
  order: {
    patient_id: string;
    patient_name: string;
    product_code: string;
    lstep_id: string;
  } | null;
}

interface PreviewResult {
  updates: TrackingUpdate[];
  errors: string[];
  total: number;
  foundOrders: number;
  notFoundOrders: number;
}

interface ConfirmResult {
  success: number;
  failed: number;
  errors: string[];
  lstepIds: string[];
}

export default function UpdateTrackingPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
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
      setPreviewResult(null);
      setConfirmResult(null);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setError("ファイルを選択してください");
      return;
    }

    setLoading(true);
    setError("");
    setPreviewResult(null);
    setConfirmResult(null);

    try {
      const text = await file.text();
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/shipping/update-tracking/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ csvContent: text }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `エラー (${res.status})`);
      }

      const data = await res.json();
      setPreviewResult(data);
    } catch (err) {
      console.error("Preview error:", err);
      setError(err instanceof Error ? err.message : "プレビューに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewResult) return;

    setConfirming(true);
    setError("");

    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/shipping/update-tracking/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates: previewResult.updates }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `エラー (${res.status})`);
      }

      const data = await res.json();
      setConfirmResult(data);
      setPreviewResult(null);
      setFile(null);
    } catch (err) {
      console.error("Confirm error:", err);
      setError(err instanceof Error ? err.message : "追跡番号付与に失敗しました");
    } finally {
      setConfirming(false);
    }
  };

  const handleDownloadLstepTag = async () => {
    if (!confirmResult || confirmResult.lstepIds.length === 0) {
      alert("LステップIDがありません");
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/shipping/lstep-tag-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lstepIds: confirmResult.lstepIds }),
      });

      if (!res.ok) {
        throw new Error("LステタグCSV生成に失敗しました");
      }

      // CSVダウンロード
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lstep_tag_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert(err instanceof Error ? err.message : "ダウンロードに失敗しました");
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

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">CSVファイル選択</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            ヤマトB2エクスポートCSV
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font:semibold
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
          {loading ? "確認中..." : "🔍 付与内容を確認"}
        </button>

        <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
          <h3 className="font-semibold mb-2">📋 CSVフォーマット</h3>
          <p>
            ヤマトB2のエクスポートCSVをそのままアップロードしてください。<br />
            必須カラム: お客様管理番号（payment_id）、伝票番号（追跡番号）
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">エラー</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* プレビュー結果 */}
      {previewResult && (
        <div className="mb-6 bg-white rounded-lg shadow">
          <div className="px-6 py-4 bg-green-50 border-b border-green-200">
            <h2 className="text-lg font-semibold text-green-900">2. データ確認</h2>
            <p className="text-sm text-green-700 mt-1">
              {previewResult.foundOrders}件の追跡番号を付与します。問題なければ「このデータを反映する」ボタンを押してください。
            </p>
          </div>

          {previewResult.updates.filter((u) => u.order !== null).length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Payment ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      患者ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      患者名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      LステップID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      追跡番号
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {previewResult.updates
                    .filter((u) => u.order !== null)
                    .map((update, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                          {update.paymentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900">
                          {update.order?.patient_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {update.order?.patient_name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                          {update.order?.lstep_id || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-green-600">
                          ✅ {update.trackingNumber}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              付与対象: <span className="font-semibold text-green-600">{previewResult.foundOrders}件</span>
              {previewResult.notFoundOrders > 0 && (
                <span className="ml-4">
                  未発見: <span className="font-semibold text-yellow-600">{previewResult.notFoundOrders}件</span>
                </span>
              )}
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming || previewResult.foundOrders === 0}
              className={`px-6 py-3 rounded-lg font-medium ${
                confirming || previewResult.foundOrders === 0
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {confirming ? "反映中..." : "このデータを反映する"}
            </button>
          </div>
        </div>
      )}

      {/* 確定結果 */}
      {confirmResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">✅ 追跡番号付与完了</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">付与成功</p>
                <p className="text-2xl font-bold text-green-700">{confirmResult.success}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">失敗</p>
                <p className="text-2xl font-bold text-red-700">{confirmResult.failed}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">LステップID</p>
                <p className="text-2xl font-bold text-blue-700">{confirmResult.lstepIds.length}</p>
              </div>
            </div>

            {confirmResult.lstepIds.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={handleDownloadLstepTag}
                  className="w-full px-6 py-3 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700"
                >
                  🏷 LステタグCSVをダウンロード ({confirmResult.lstepIds.length}件)
                </button>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  LステップにインポートできるCSV形式でダウンロードします
                </p>
              </div>
            )}

            {confirmResult.errors.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-red-900 mb-2">エラー詳細</h3>
                <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                  {confirmResult.errors.slice(0, 10).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {confirmResult.errors.length > 10 && (
                    <li>...他 {confirmResult.errors.length - 10}件</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
