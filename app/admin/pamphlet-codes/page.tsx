"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { ErrorFallback } from "@/components/admin/ErrorFallback";

interface PamphletCode {
  id: number;
  code: string;
  label: string;
  expires_at: string | null;
  is_active: boolean;
  used_count: number;
  last_used_at: string | null;
  created_at: string;
}

const API = "/api/admin/pamphlet-codes";

function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function PamphletCodesPage() {
  const { data, error, isLoading } = useSWR<{ items: PamphletCode[] }>(API);
  const items = data?.items ?? [];

  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setShowForm(false);
    setCode("");
    setLabel("");
    setExpiresAt("");
  };

  const handleCreate = async () => {
    if (!code.trim()) return alert("コードを入力してください");
    setSaving(true);
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        code: code.trim(),
        label: label.trim(),
        expires_at: expiresAt || null,
      }),
    });
    if (res.ok) {
      await mutate(API);
      resetForm();
    } else {
      const d = await res.json();
      alert(d.message || "作成に失敗しました");
    }
    setSaving(false);
  };

  const handleToggle = async (item: PamphletCode) => {
    await fetch(API, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
    });
    await mutate(API);
  };

  const handleDelete = async (item: PamphletCode) => {
    if (!confirm(`「${item.label || item.code}」を削除しますか？`)) return;
    await fetch(`${API}?id=${item.id}`, { method: "DELETE", credentials: "include" });
    await mutate(API);
  };

  const handleCopyLink = (c: string) => {
    const url = `${window.location.origin}/lp/pamphlet?code=${encodeURIComponent(c)}`;
    navigator.clipboard.writeText(url);
    alert("リンクをコピーしました");
  };

  if (error) return <ErrorFallback error={error} retry={() => mutate(API)} />;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">パンフレットコード管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              申込者に発行するパンフレット閲覧用のアクセスコードを管理します
            </p>
          </div>
          <button
            onClick={() => { setCode(generateCode()); setShowForm(true); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            ＋ コード発行
          </button>
        </div>

        {/* 新規作成フォーム */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-gray-800">新規コード発行</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">コード</label>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                    placeholder="ABCD1234"
                  />
                  <button
                    onClick={() => setCode(generateCode())}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                    title="自動生成"
                  >
                    🔄
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">ラベル（申込者名等）</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="〇〇クリニック 山田様"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">有効期限（任意）</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "作成中..." : "発行する"}
              </button>
              <button onClick={resetForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* 一覧 */}
        {isLoading ? (
          <div className="py-20 text-center text-sm text-gray-400">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <p className="text-sm text-gray-400">まだコードが発行されていません</p>
            <p className="mt-1 text-xs text-gray-400">右上の「コード発行」から新しいコードを作成してください</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">コード</th>
                  <th className="px-4 py-3">ラベル</th>
                  <th className="px-4 py-3">状態</th>
                  <th className="px-4 py-3">閲覧数</th>
                  <th className="px-4 py-3">有効期限</th>
                  <th className="px-4 py-3">作成日</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => {
                  const expired = item.expires_at && new Date(item.expires_at) < new Date();
                  return (
                    <tr key={item.id} className={`${!item.is_active || expired ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">{item.code}</td>
                      <td className="px-4 py-3 text-gray-600">{item.label || "—"}</td>
                      <td className="px-4 py-3">
                        {expired ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">期限切れ</span>
                        ) : item.is_active ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">有効</span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">無効</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.used_count}回</td>
                      <td className="px-4 py-3 text-gray-500">
                        {item.expires_at ? new Date(item.expires_at).toLocaleDateString("ja-JP") : "無期限"}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(item.created_at).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleCopyLink(item.code)}
                            className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                            title="リンクをコピー"
                          >
                            リンク
                          </button>
                          <button
                            onClick={() => handleToggle(item)}
                            className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            {item.is_active ? "無効化" : "有効化"}
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
