"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";

/** バックアップレコード型 */
interface Backup {
  id: string;
  name: string;
  description: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  file_size: number | null;
  tables_included: string[] | null;
  record_counts: Record<string, number> | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

/** ファイルサイズを人間可読形式に変換 */
function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** ステータスバッジ */
function StatusBadge({ status }: { status: Backup["status"] }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    pending: "待機中",
    processing: "処理中",
    completed: "完了",
    failed: "失敗",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

const SWR_KEY = "/api/admin/backup";

export default function BackupPage() {
  const { data: backupData, isLoading: loading } = useSWR<{ ok: boolean; backups: Backup[] }>(SWR_KEY);
  const backups = backupData?.backups ?? [];

  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    backupId: string;
    backupName: string;
  } | null>(null);
  const [newBackup, setNewBackup] = useState({ name: "", description: "" });
  const [showCreateForm, setShowCreateForm] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /** 新規バックアップ作成 */
  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBackup.name || undefined,
          description: newBackup.description || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("バックアップを作成しました", "success");
        setShowCreateForm(false);
        setNewBackup({ name: "", description: "" });
        mutate(SWR_KEY);
      } else {
        showToast(data.message || "バックアップの作成に失敗しました", "error");
      }
    } catch {
      showToast("バックアップの作成に失敗しました", "error");
    } finally {
      setCreating(false);
    }
  };

  /** ダウンロード */
  const handleDownload = async (backupId: string) => {
    try {
      const res = await fetch(`/api/admin/backup/${backupId}/download`);
      if (!res.ok) {
        showToast("ダウンロードに失敗しました", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "backup.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast("ダウンロードに失敗しました", "error");
    }
  };

  /** リストア確認ダイアログを表示 */
  const handleRestoreClick = (backup: Backup) => {
    setConfirmDialog({ backupId: backup.id, backupName: backup.name });
  };

  /** リストア実行 */
  const handleRestoreConfirm = async () => {
    if (!confirmDialog) return;
    setRestoring(confirmDialog.backupId);
    setConfirmDialog(null);

    try {
      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backup_id: confirmDialog.backupId,
          confirm: true,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("リストアが完了しました", "success");
        mutate(SWR_KEY);
      } else {
        showToast(data.message || "リストアに失敗しました", "error");
      }
    } catch {
      showToast("リストアに失敗しました", "error");
    } finally {
      setRestoring(null);
    }
  };

  /** バックアップ削除 */
  const handleDelete = async (backupId: string) => {
    if (!window.confirm("このバックアップを削除しますか？")) return;

    try {
      const res = await fetch(`/api/admin/backup/${backupId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        showToast("バックアップを削除しました", "success");
        mutate(SWR_KEY);
      } else {
        showToast("削除に失敗しました", "error");
      }
    } catch {
      showToast("削除に失敗しました", "error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* トースト */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* リストア確認ダイアログ */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-red-600 mb-3">リストアの確認</h3>
            <p className="text-sm text-gray-700 mb-2">
              バックアップ「{confirmDialog.backupName}」からリストアを実行しますか？
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700 font-medium">
                注意: 現在の全データが上書きされます。この操作は取り消せません。
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleRestoreConfirm}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                リストアを実行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">バックアップ管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            テナントデータのバックアップと復元を管理します
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          新規バックアップ
        </button>
      </div>

      {/* 新規作成フォーム */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="text-base font-semibold mb-4">新規バックアップ作成</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                バックアップ名
              </label>
              <input
                type="text"
                value={newBackup.name}
                onChange={(e) => setNewBackup({ ...newBackup, name: e.target.value })}
                placeholder="例: 定期バックアップ"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明（任意）
              </label>
              <textarea
                value={newBackup.description}
                onChange={(e) => setNewBackup({ ...newBackup, description: e.target.value })}
                placeholder="バックアップの目的や備考"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* バックアップ一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : backups.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-500">バックアップはまだありません</p>
          <p className="text-sm text-gray-400 mt-1">
            「新規バックアップ」ボタンから作成してください
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">名前</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ステータス</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">サイズ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">作成日時</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{backup.name}</div>
                    {backup.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{backup.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={backup.status} />
                    {backup.error_message && (
                      <div className="text-xs text-red-500 mt-1">{backup.error_message}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatFileSize(backup.file_size)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(backup.created_at).toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {backup.status === "completed" && (
                        <>
                          <button
                            onClick={() => handleDownload(backup.id)}
                            className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                          >
                            ダウンロード
                          </button>
                          <button
                            onClick={() => handleRestoreClick(backup)}
                            disabled={restoring === backup.id}
                            className="px-3 py-1 text-xs rounded border border-orange-300 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                          >
                            {restoring === backup.id ? "リストア中..." : "リストア"}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(backup.id)}
                        className="px-3 py-1 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* レコード数詳細 */}
      {backups.some((b) => b.record_counts) && (
        <div className="mt-6">
          <h2 className="text-base font-semibold mb-3 text-gray-700">
            最新バックアップのレコード数
          </h2>
          {(() => {
            const latest = backups.find((b) => b.status === "completed" && b.record_counts);
            if (!latest?.record_counts) return null;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(latest.record_counts).map(([table, count]) => (
                  <div
                    key={table}
                    className="bg-white border border-gray-200 rounded-lg p-3 text-center"
                  >
                    <div className="text-xs text-gray-500">{table}</div>
                    <div className="text-lg font-bold text-gray-800">{count}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
