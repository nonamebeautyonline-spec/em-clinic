"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TrackingEntry {
  payment_id: string;
  patient_name: string;
  tracking_number: string;
  matched: boolean;
}

interface ManualEntry extends TrackingEntry {
  isManual: true;
  tempId: string;
}

interface PreviewResult {
  entries: TrackingEntry[];
  summary: {
    total: number;
    found: number;
    notFound: number;
  };
}

interface ConfirmResult {
  success: boolean;
  updated: number;
  failed: number;
  message: string;
  details?: Array<{
    payment_id: string;
    success: boolean;
    error?: string;
  }>;
}

export default function TrackingNumberPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [error, setError] = useState("");
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [editedEntries, setEditedEntries] = useState<Map<string, TrackingEntry>>(
    new Map()
  );
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    payment_id: "",
    patient_name: "",
    tracking_number: "",
  });

  const handleLoadTodayShipped = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admin/shipping/today-shipped", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `エラー (${res.status})`);
      }

      const data = await res.json();
      setPreviewResult({
        entries: data.entries,
        summary: {
          total: data.summary.total,
          found: data.summary.withTracking,
          notFound: data.summary.withoutTracking,
        },
      });
    } catch (err) {
      console.error("Load today shipped error:", err);
      setError(
        err instanceof Error ? err.message : "本日発送分の読み込みに失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError("");
      setEditedEntries(new Map());
      setManualEntries([]);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setError("CSVファイルを選択してください");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/shipping/update-tracking/preview", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `エラー (${res.status})`);
      }

      const data = await res.json();

      // 既存のpreviewResultがある場合（本日発送分を読み込み済み）、マージする
      if (previewResult) {
        // CSVの追跡番号をマップに変換
        const csvTrackingMap = new Map<string, string>();
        data.entries.forEach((entry: TrackingEntry) => {
          if (entry.tracking_number) {
            csvTrackingMap.set(entry.payment_id, entry.tracking_number);
          }
        });

        // 既存のentriesを更新
        const mergedEntries = previewResult.entries.map((entry) => {
          const csvTracking = csvTrackingMap.get(entry.payment_id);
          if (csvTracking) {
            return {
              ...entry,
              tracking_number: csvTracking,
              matched: true,
            };
          }
          return entry;
        });

        setPreviewResult({
          entries: mergedEntries,
          summary: {
            total: mergedEntries.length,
            found: mergedEntries.filter((e) => e.tracking_number).length,
            notFound: mergedEntries.filter((e) => !e.tracking_number).length,
          },
        });
      } else {
        // 本日発送分を読み込んでいない場合は、そのまま設定
        setPreviewResult(data);
      }
    } catch (err) {
      console.error("Preview error:", err);
      setError(
        err instanceof Error ? err.message : "プレビュー取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTrackingNumberChange = (
    paymentId: string,
    newValue: string
  ) => {
    const entry = previewResult?.entries.find(
      (e) => e.payment_id === paymentId
    ) || manualEntries.find((e) => e.payment_id === paymentId);

    if (entry) {
      const updated: TrackingEntry = {
        ...entry,
        tracking_number: newValue,
      };
      setEditedEntries(new Map(editedEntries).set(paymentId, updated));
    }
  };

  const handleRemoveEntry = (paymentId: string) => {
    const isManual = manualEntries.some((e) => e.payment_id === paymentId);
    if (isManual) {
      setManualEntries(manualEntries.filter((e) => e.payment_id !== paymentId));
    } else {
      // Mark as removed by clearing tracking number
      const entry = previewResult?.entries.find(
        (e) => e.payment_id === paymentId
      );
      if (entry) {
        const updated: TrackingEntry = {
          ...entry,
          tracking_number: "",
        };
        setEditedEntries(new Map(editedEntries).set(paymentId, updated));
      }
    }
  };

  const handleAddManualEntry = () => {
    if (
      !manualForm.payment_id.trim() ||
      !manualForm.patient_name.trim() ||
      !manualForm.tracking_number.trim()
    ) {
      setError("すべてのフィールドを入力してください");
      return;
    }

    const tempId = `manual_${Date.now()}`;
    const newEntry: ManualEntry = {
      payment_id: manualForm.payment_id,
      patient_name: manualForm.patient_name,
      tracking_number: manualForm.tracking_number,
      matched: true,
      isManual: true,
      tempId,
    };

    setManualEntries([...manualEntries, newEntry]);
    setManualForm({ payment_id: "", patient_name: "", tracking_number: "" });
    setShowAddManual(false);
    setError("");
  };

  const getDisplayEntries = (): TrackingEntry[] => {
    if (!previewResult) return manualEntries;

    const display = previewResult.entries.map((entry) => {
      return editedEntries.get(entry.payment_id) || entry;
    });

    return display.concat(manualEntries);
  };

  const handleConfirm = async () => {
    if (!previewResult && manualEntries.length === 0) return;

    setConfirming(true);
    setError("");

    try {
      const entries = getDisplayEntries().filter(
        (e) => e.tracking_number.trim() !== ""
      );

      const res = await fetch("/api/admin/shipping/update-tracking/confirm", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entries }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `エラー (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
      setPreviewResult(null);
      setFile(null);
      setEditedEntries(new Map());
      setManualEntries([]);
    } catch (err) {
      console.error("Confirm error:", err);
      setError(
        err instanceof Error ? err.message : "更新に失敗しました"
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleDownloadLstepTags = async () => {
    try {
      const res = await fetch("/api/admin/shipping/export-lstep-tags", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `エラー (${res.status})`);
      }

      // CSVをダウンロード
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().split("T")[0];
      a.download = `lstep_tags_${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download Lstep tags error:", err);
      alert(
        err instanceof Error
          ? err.message
          : "LステップタグCSVのダウンロードに失敗しました"
      );
    }
  };

  const displayEntries = getDisplayEntries();
  const validEntries = displayEntries.filter((e) => e.tracking_number.trim() !== "");
  const foundCount = displayEntries.filter((e) => e.matched).length;

  // 患者名でグループ化して色を割り当て
  const getPatientColor = (patientName: string): string => {
    // 同じ患者名の注文数を数える
    const samePatientCount = displayEntries.filter((e) => e.patient_name === patientName).length;

    // 1件のみの場合は色づけしない
    if (samePatientCount === 1) return "";

    // 複数ある場合は色づけ
    const colors = [
      "bg-blue-50",
      "bg-green-50",
      "bg-yellow-50",
      "bg-pink-50",
      "bg-purple-50",
      "bg-indigo-50",
      "bg-orange-50",
      "bg-cyan-50",
    ];

    // 患者名からハッシュ値を生成して色を選択
    const hash = patientName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          追跡番号一括割り当て
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          CSVファイルをアップロードして、注文に追跡番号を割り当てます
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          1. 本日発送分を読み込む
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          本日Yamato B2 CSVを出力した全注文を読み込みます。まとめ配送で消えたpayment_idも含めて表示されます。
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLoadTodayShipped}
            disabled={loading}
            className={`px-6 py-3 rounded-lg font-medium ${
              loading
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {loading ? "読み込み中..." : "📋 本日発送分を読み込む"}
          </button>

          <button
            onClick={handleDownloadLstepTags}
            className="px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            📥 Lステップタグをダウンロード
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          ※ Lステップタグは本日追跡番号を付与した患者に「発送したよ」タグを付けるためのCSVです
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          2. ヤマトCSVで照合（オプション）
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            追跡番号CSVファイル
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
          {loading ? "プレビュー取得中..." : "🔍 プレビュー"}
        </button>

        <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
          <h3 className="font-semibold mb-2">📋 CSVフォーマット要件</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>1行目: ヘッダー（Payment ID, Tracking Number など）</li>
            <li>2行目以降: [Payment ID, 追跡番号] の形式</li>
            <li>Payment ID は system の注文IDと一致する必要があります</li>
            <li>追跡番号は有効な値である必要があります</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">エラー</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* プレビューセクション */}
      {previewResult && (
        <div className="mb-6 bg-white rounded-lg shadow">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
            <h2 className="text-lg font-semibold text-blue-900">3. データ確認と編集</h2>
            <p className="text-sm text-blue-700 mt-1">
              {displayEntries.length}件のデータを表示します。追跡番号を編集することができます。
            </p>
            <div className="mt-2 flex gap-4 text-sm">
              <span className="text-green-700">✅ 追跡番号あり: {foundCount}件</span>
              <span className="text-yellow-700">⚠️ 追跡番号なし: {displayEntries.length - foundCount}件</span>
            </div>
          </div>

          {/* 手動追加セクション */}
          <div className="px-6 py-4 border-b border-slate-200">
            <button
              onClick={() => setShowAddManual(!showAddManual)}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              {showAddManual ? "キャンセル" : "+ 手動追加"}
            </button>

            {showAddManual && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Payment ID"
                    value={manualForm.payment_id}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        payment_id: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="患者名"
                    value={manualForm.patient_name}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        patient_name: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="追跡番号"
                    value={manualForm.tracking_number}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        tracking_number: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={handleAddManualEntry}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                >
                  追加
                </button>
              </div>
            )}

            {manualEntries.length > 0 && (
              <div className="mt-3 text-sm text-green-700">
                手動追加: {manualEntries.length}件
              </div>
            )}
          </div>

          {displayEntries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Payment ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      患者名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      追跡番号
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {displayEntries.map((entry) => {
                    const rowColor = getPatientColor(entry.patient_name);
                    return (
                      <tr key={entry.payment_id} className={`${rowColor} hover:brightness-95`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                          {entry.payment_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                          {entry.patient_name}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <input
                          type="text"
                          value={
                            editedEntries.get(entry.payment_id)?.tracking_number ??
                            entry.tracking_number
                          }
                          onChange={(e) =>
                            handleTrackingNumberChange(
                              entry.payment_id,
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-mono"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {entry.matched ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            ✅ 一致
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            ⚠️ 未検出
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleRemoveEntry(entry.payment_id)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              総数: <span className="font-semibold text-slate-900">{displayEntries.length}件</span>
              <span className="ml-4">
                有効: <span className="font-semibold text-green-600">{validEntries.length}件</span>
              </span>
              <span className="ml-4">
                一致: <span className="font-semibold text-blue-600">{foundCount}件</span>
              </span>
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming || validEntries.length === 0}
              className={`px-6 py-3 rounded-lg font-medium ${
                confirming || validEntries.length === 0
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {confirming ? "更新中..." : "このデータを反映する"}
            </button>
          </div>
        </div>
      )}

      {/* 結果セクション */}
      {result && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              更新結果サマリー
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">処理件数</p>
                <p className="text-2xl font-bold text-slate-900">
                  {result.updated + (result.failed || 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">更新成功</p>
                <p className="text-2xl font-bold text-green-700">
                  {result.updated}
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">失敗</p>
                <p className="text-2xl font-bold text-red-700">
                  {result.failed || 0}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600">{result.message}</p>

            {/* Lステップタグダウンロードボタン */}
            {result.updated > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">
                      Lステップタグをダウンロード
                    </h3>
                    <p className="mt-1 text-xs text-blue-700">
                      本日発送した患者に「発送したよ」タグを付与するためのCSVをダウンロードします
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadLstepTags}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    📥 CSVダウンロード
                  </button>
                </div>
              </div>
            )}
          </div>

          {result.details && result.details.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">
                  詳細情報
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Payment ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        ステータス
                      </th>
                      {result.details?.some((d) => d.error) && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          エラー
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {result.details.map((detail) => (
                      <tr key={detail.payment_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                          {detail.payment_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {detail.success ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              ✅ 成功
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              ❌ 失敗
                            </span>
                          )}
                        </td>
                        {result.details?.some((d) => d.error) && (
                          <td className="px-6 py-4 text-sm text-red-600">
                            {detail.error || "-"}
                          </td>
                        )}
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
