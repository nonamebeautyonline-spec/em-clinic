"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ---------- 型定義 ---------- */

/** 同期ログ1件 */
interface SyncLog {
  id: string;
  created_at: string;
  provider: string;
  direction: string;    // "pull" | "push"
  resource_type: string; // "patient" | "karte" | "both"
  patient_id: string | null;
  external_id: string | null;
  status: "success" | "error" | "skipped";
  detail: string | null;
}

/** 同期実行レスポンス */
interface SyncResult {
  success: number;
  error: number;
  skipped: number;
  errors?: string[];
}

/** 外部患者検索結果 */
interface ExternalPatient {
  external_id: string;
  name: string;
  sex: string | null;
  birthday: string | null;
  tel: string | null;
}

/* ---------- 定数 ---------- */

const PROVIDER_LABELS: Record<string, string> = {
  orca: "ORCA",
  csv: "CSV",
  fhir: "FHIR",
};

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
  skipped: "bg-yellow-100 text-yellow-700",
};

const STATUS_LABELS: Record<string, string> = {
  success: "成功",
  error: "エラー",
  skipped: "スキップ",
};

/* ---------- ステータスバッジ ---------- */
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/* ---------- メインコンポーネント ---------- */
export default function EhrDashboardPage() {
  // ステータスカード用
  const [provider, setProvider] = useState<string | null>(null);
  const [mappingCount, setMappingCount] = useState<number | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // 手動同期フォーム
  const [syncDirection, setSyncDirection] = useState<"pull" | "push">("pull");
  const [syncResourceType, setSyncResourceType] = useState<"patient" | "karte" | "both">("both");
  const [syncPatientIds, setSyncPatientIds] = useState("");
  const [syncAllPatients, setSyncAllPatients] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState("");

  // CSVインポート/エクスポート
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImportType, setCsvImportType] = useState<"patient" | "karte">("patient");
  const [csvExportType, setCsvExportType] = useState<"patient" | "karte">("patient");
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvExporting, setCsvExporting] = useState(false);
  const [csvMessage, setCsvMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 外部患者検索
  const [searchName, setSearchName] = useState("");
  const [searchTel, setSearchTel] = useState("");
  const [searchBirthday, setSearchBirthday] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ExternalPatient[]>([]);
  const [searchError, setSearchError] = useState("");

  // 同期ログ
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsOffset, setLogsOffset] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const LOGS_LIMIT = 50;

  /* ========== データ取得 ========== */

  /** ステータスカード情報を取得 */
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      // 設定からプロバイダー情報を取得
      const settingsRes = await fetch("/api/admin/settings?category=ehr", {
        credentials: "include",
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        // 設定からプロバイダー名を抽出
        const providerSetting = settingsData?.items?.find(
          (item: { key: string }) => item.key === "ehr_provider"
        );
        setProvider(providerSetting?.value ?? null);
      }

      // 同期ログから最新情報とマッピング数を取得
      const logsRes = await fetch("/api/admin/ehr/logs?limit=1", {
        credentials: "include",
      });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setMappingCount(logsData.mapping_count ?? 0);
        if (logsData.logs?.length > 0) {
          setLastSyncAt(logsData.logs[0].created_at);
        }
      }
    } catch {
      // ステータスカード取得失敗は静かに無視
    } finally {
      setStatusLoading(false);
    }
  }, []);

  /** 同期ログ一覧を取得 */
  const fetchLogs = useCallback(async (offset = 0, append = false) => {
    if (!append) setLogsLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/admin/ehr/logs?limit=${LOGS_LIMIT}&offset=${offset}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("ログ取得に失敗しました");

      const data = await res.json();
      const newLogs: SyncLog[] = data.logs ?? [];

      if (append) {
        setLogs((prev) => [...prev, ...newLogs]);
      } else {
        setLogs(newLogs);
      }

      setHasMoreLogs(newLogs.length >= LOGS_LIMIT);
      setLogsOffset(offset + newLogs.length);
    } catch {
      // ログ取得失敗は静かに無視
    } finally {
      setLogsLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    fetchStatus();
    fetchLogs(0);
  }, [fetchStatus, fetchLogs]);

  /* ========== 手動同期 ========== */

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError("");

    try {
      // 患者IDの組み立て
      let patientIds: string[] | null = null;
      if (!syncAllPatients && syncPatientIds.trim()) {
        patientIds = syncPatientIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }

      const body: Record<string, unknown> = {
        direction: syncDirection,
        resource_type: syncResourceType,
      };
      if (patientIds) {
        body.patient_ids = patientIds;
      }

      const res = await fetch("/api/admin/ehr/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setSyncError(data.error ?? "同期に失敗しました");
        return;
      }

      setSyncResult(data);
      // ログとステータスを再取得
      fetchLogs(0);
      fetchStatus();
    } catch {
      setSyncError("同期リクエストに失敗しました");
    } finally {
      setSyncing(false);
    }
  };

  /* ========== CSVインポート ========== */

  const handleCsvImport = async () => {
    if (!csvFile) return;
    setCsvImporting(true);
    setCsvMessage("");

    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("type", csvImportType);

      const res = await fetch("/api/admin/ehr/import-csv", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setCsvMessage(`エラー: ${data.error ?? "インポートに失敗しました"}`);
        return;
      }

      setCsvMessage(
        `インポート完了: 成功 ${data.success ?? 0}件, エラー ${data.error ?? 0}件, スキップ ${data.skipped ?? 0}件`
      );
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // ログとステータスを再取得
      fetchLogs(0);
      fetchStatus();
    } catch {
      setCsvMessage("インポートリクエストに失敗しました");
    } finally {
      setCsvImporting(false);
    }
  };

  /* ========== CSVエクスポート ========== */

  const handleCsvExport = async () => {
    setCsvExporting(true);
    setCsvMessage("");

    try {
      const res = await fetch("/api/admin/ehr/export-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: csvExportType }),
      });

      if (!res.ok) {
        const data = await res.json();
        setCsvMessage(`エラー: ${data.error ?? "エクスポートに失敗しました"}`);
        return;
      }

      // CSVファイルをダウンロード
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ehr_${csvExportType}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setCsvMessage("エクスポートが完了しました");
    } catch {
      setCsvMessage("エクスポートリクエストに失敗しました");
    } finally {
      setCsvExporting(false);
    }
  };

  /* ========== 外部患者検索 ========== */

  const handleSearch = async () => {
    setSearching(true);
    setSearchResults([]);
    setSearchError("");

    try {
      const params = new URLSearchParams();
      if (searchName.trim()) params.set("name", searchName.trim());
      if (searchTel.trim()) params.set("tel", searchTel.trim());
      if (searchBirthday.trim()) params.set("birthday", searchBirthday.trim());

      if (!params.toString()) {
        setSearchError("検索条件を1つ以上入力してください");
        setSearching(false);
        return;
      }

      const res = await fetch(`/api/admin/ehr/patients?${params.toString()}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? "検索に失敗しました");
        return;
      }

      setSearchResults(data.patients ?? []);
    } catch {
      setSearchError("検索リクエストに失敗しました");
    } finally {
      setSearching(false);
    }
  };

  /* ========== もっと見る（ログ追加読み込み） ========== */

  const handleLoadMore = () => {
    fetchLogs(logsOffset, true);
  };

  /* ========== 日時フォーマット ========== */

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ========== レンダリング ========== */

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">カルテ連携</h1>
        <p className="mt-1 text-sm text-gray-500">
          外部電子カルテシステムとの同期・データ連携を管理します
        </p>
      </div>

      {/* ========== 1. ステータスカード ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 連携プロバイダー */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            連携プロバイダー
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {statusLoading
              ? "..."
              : provider
                ? PROVIDER_LABELS[provider] ?? provider
                : "未設定"}
          </p>
        </div>

        {/* 同期済み患者数 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            同期済み患者数
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {statusLoading ? "..." : `${mappingCount ?? 0} 人`}
          </p>
        </div>

        {/* 最終同期日時 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            最終同期日時
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {statusLoading
              ? "..."
              : lastSyncAt
                ? formatDateTime(lastSyncAt)
                : "未同期"}
          </p>
        </div>
      </div>

      {/* ========== 2. 手動同期セクション ========== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">手動同期</h2>

        <div className="space-y-4">
          {/* 方向選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              同期方向
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sync-direction"
                  value="pull"
                  checked={syncDirection === "pull"}
                  onChange={() => setSyncDirection("pull")}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">
                  プル（外部→自院）
                </span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sync-direction"
                  value="push"
                  checked={syncDirection === "push"}
                  onChange={() => setSyncDirection("push")}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">
                  プッシュ（自院→外部）
                </span>
              </label>
            </div>
          </div>

          {/* データ種別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              データ種別
            </label>
            <div className="flex gap-4">
              {(["patient", "karte", "both"] as const).map((t) => (
                <label
                  key={t}
                  className="inline-flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="sync-resource"
                    value={t}
                    checked={syncResourceType === t}
                    onChange={() => setSyncResourceType(t)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    {t === "patient"
                      ? "患者のみ"
                      : t === "karte"
                        ? "カルテのみ"
                        : "両方"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 患者ID入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              対象患者
            </label>
            <div className="flex items-center gap-3 mb-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncAllPatients}
                  onChange={(e) => setSyncAllPatients(e.target.checked)}
                  className="text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">全患者</span>
              </label>
            </div>
            {!syncAllPatients && (
              <textarea
                value={syncPatientIds}
                onChange={(e) => setSyncPatientIds(e.target.value)}
                placeholder="患者IDをカンマ区切りで入力（例: abc123, def456）"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          {/* 同期実行ボタン */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? "同期中..." : "同期実行"}
          </button>

          {/* 実行結果 */}
          {syncResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                同期結果
              </h3>
              <div className="flex gap-6 text-sm">
                <span className="text-green-700">
                  成功: {syncResult.success}件
                </span>
                <span className="text-red-700">
                  エラー: {syncResult.error}件
                </span>
                <span className="text-yellow-700">
                  スキップ: {syncResult.skipped}件
                </span>
              </div>
              {syncResult.errors && syncResult.errors.length > 0 && (
                <div className="mt-2 text-xs text-red-600 space-y-1">
                  {syncResult.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* エラーメッセージ */}
          {syncError && (
            <p className="text-sm text-red-600 mt-2">{syncError}</p>
          )}
        </div>
      </div>

      {/* ========== 3. CSVインポート/エクスポート ========== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          CSVインポート / エクスポート
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* インポート */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">インポート</h3>

            {/* ファイル選択 */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* 種別選択 */}
            <div className="flex gap-4">
              {(["patient", "karte"] as const).map((t) => (
                <label
                  key={t}
                  className="inline-flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="csv-import-type"
                    value={t}
                    checked={csvImportType === t}
                    onChange={() => setCsvImportType(t)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    {t === "patient" ? "患者" : "カルテ"}
                  </span>
                </label>
              ))}
            </div>

            <button
              onClick={handleCsvImport}
              disabled={csvImporting || !csvFile}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {csvImporting ? "インポート中..." : "インポート"}
            </button>
          </div>

          {/* エクスポート */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">エクスポート</h3>

            {/* 種別選択 */}
            <div className="flex gap-4">
              {(["patient", "karte"] as const).map((t) => (
                <label
                  key={t}
                  className="inline-flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="csv-export-type"
                    value={t}
                    checked={csvExportType === t}
                    onChange={() => setCsvExportType(t)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    {t === "patient" ? "患者" : "カルテ"}
                  </span>
                </label>
              ))}
            </div>

            <button
              onClick={handleCsvExport}
              disabled={csvExporting}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {csvExporting ? "エクスポート中..." : "CSVダウンロード"}
            </button>
          </div>
        </div>

        {/* CSVメッセージ */}
        {csvMessage && (
          <p
            className={`mt-4 text-sm ${
              csvMessage.startsWith("エラー") ? "text-red-600" : "text-green-700"
            }`}
          >
            {csvMessage}
          </p>
        )}
      </div>

      {/* ========== 4. 外部患者検索 ========== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          外部患者検索
        </h2>

        {/* 検索フォーム */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              氏名
            </label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="山田 太郎"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              電話番号
            </label>
            <input
              type="text"
              value={searchTel}
              onChange={(e) => setSearchTel(e.target.value)}
              placeholder="09012345678"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              生年月日
            </label>
            <input
              type="date"
              value={searchBirthday}
              onChange={(e) => setSearchBirthday(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {searching ? "検索中..." : "検索"}
        </button>

        {/* 検索エラー */}
        {searchError && (
          <p className="mt-3 text-sm text-red-600">{searchError}</p>
        )}

        {/* 検索結果テーブル */}
        {searchResults.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 px-3 text-xs font-medium text-gray-500">
                    外部ID
                  </th>
                  <th className="py-2 px-3 text-xs font-medium text-gray-500">
                    氏名
                  </th>
                  <th className="py-2 px-3 text-xs font-medium text-gray-500">
                    性別
                  </th>
                  <th className="py-2 px-3 text-xs font-medium text-gray-500">
                    生年月日
                  </th>
                  <th className="py-2 px-3 text-xs font-medium text-gray-500">
                    電話番号
                  </th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((p) => (
                  <tr
                    key={p.external_id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 px-3 text-gray-900 font-mono text-xs">
                      {p.external_id}
                    </td>
                    <td className="py-2 px-3 text-gray-900">{p.name}</td>
                    <td className="py-2 px-3 text-gray-700">{p.sex ?? "-"}</td>
                    <td className="py-2 px-3 text-gray-700">
                      {p.birthday ?? "-"}
                    </td>
                    <td className="py-2 px-3 text-gray-700">{p.tel ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 検索結果が0件 */}
        {!searching && searchResults.length === 0 && searchName && !searchError && (
          <p className="mt-3 text-sm text-gray-500">
            該当する患者が見つかりませんでした
          </p>
        )}
      </div>

      {/* ========== 5. 同期ログ ========== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">同期ログ</h2>

        {logsLoading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500">同期ログがありません</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-2 px-3 text-xs font-medium text-gray-500">
                      日時
                    </th>
                    <th className="py-2 px-3 text-xs font-medium text-gray-500">
                      プロバイダー
                    </th>
                    <th className="py-2 px-3 text-xs font-medium text-gray-500">
                      方向
                    </th>
                    <th className="py-2 px-3 text-xs font-medium text-gray-500">
                      種別
                    </th>
                    <th className="py-2 px-3 text-xs font-medium text-gray-500">
                      患者ID
                    </th>
                    <th className="py-2 px-3 text-xs font-medium text-gray-500">
                      外部ID
                    </th>
                    <th className="py-2 px-3 text-xs font-medium text-gray-500">
                      ステータス
                    </th>
                    <th className="py-2 px-3 text-xs font-medium text-gray-500">
                      詳細
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3 text-gray-700 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-2 px-3 text-gray-700">
                        {PROVIDER_LABELS[log.provider] ?? log.provider}
                      </td>
                      <td className="py-2 px-3 text-gray-700">
                        {log.direction === "pull" ? "プル" : "プッシュ"}
                      </td>
                      <td className="py-2 px-3 text-gray-700">
                        {log.resource_type === "patient"
                          ? "患者"
                          : log.resource_type === "karte"
                            ? "カルテ"
                            : "両方"}
                      </td>
                      <td className="py-2 px-3 text-gray-700 font-mono text-xs">
                        {log.patient_id ?? "-"}
                      </td>
                      <td className="py-2 px-3 text-gray-700 font-mono text-xs">
                        {log.external_id ?? "-"}
                      </td>
                      <td className="py-2 px-3">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs max-w-xs truncate">
                        {log.detail ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* もっと見るボタン */}
            {hasMoreLogs && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                >
                  {loadingMore ? "読み込み中..." : "もっと見る"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
