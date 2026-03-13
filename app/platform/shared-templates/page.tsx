"use client";

import { useState } from "react";
import useSWR from "swr";

// 共有テンプレート型
interface SharedTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: Record<string, unknown>;
  template_type: "message" | "flex" | "workflow";
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// テンプレートタイプラベル
const TYPE_LABELS: Record<string, string> = {
  message: "メッセージ",
  flex: "Flex",
  workflow: "ワークフロー",
};

// テンプレートタイプカラー
const TYPE_COLORS: Record<string, string> = {
  message: "bg-blue-100 text-blue-700",
  flex: "bg-purple-100 text-purple-700",
  workflow: "bg-amber-100 text-amber-700",
};

export default function SharedTemplatesPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  // モーダル関連
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formType, setFormType] = useState<"message" | "flex" | "workflow">("message");
  const [formTags, setFormTags] = useState("");
  const [formContent, setFormContent] = useState("{}");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // 動的SWRキー
  const swrParams = new URLSearchParams();
  if (search) swrParams.set("search", search);
  if (filterType) swrParams.set("template_type", filterType);
  swrParams.set("page", String(page));
  swrParams.set("limit", String(limit));

  const { data: rawData, isLoading: loading, mutate: refreshTemplates } = useSWR<{
    templates: SharedTemplate[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>(`/api/platform/shared-templates?${swrParams}`);

  const templates = rawData?.templates || [];
  const pagination = rawData?.pagination || { total: 0, page: 1, limit: 25, totalPages: 0 };

  // フォームリセット
  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormCategory("");
    setFormType("message");
    setFormTags("");
    setFormContent("{}");
    setFormIsActive(true);
  };

  // 編集モーダルを開く
  const openEdit = (t: SharedTemplate) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormDescription(t.description || "");
    setFormCategory(t.category || "");
    setFormType(t.template_type);
    setFormTags((t.tags || []).join(", "));
    setFormContent(JSON.stringify(t.content, null, 2));
    setFormIsActive(t.is_active);
    setShowModal(true);
  };

  // 保存処理
  const handleSave = async () => {
    setSaving(true);
    try {
      let parsedContent: Record<string, unknown> = {};
      try {
        parsedContent = JSON.parse(formContent);
      } catch {
        alert("コンテンツのJSON形式が不正です");
        setSaving(false);
        return;
      }

      const body = {
        name: formName,
        description: formDescription,
        category: formCategory,
        template_type: formType,
        tags: formTags.split(",").map((t) => t.trim()).filter(Boolean),
        content: parsedContent,
        is_active: formIsActive,
      };

      const url = editingId
        ? `/api/platform/shared-templates/${editingId}`
        : "/api/platform/shared-templates";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        refreshTemplates();
      } else {
        const err = await res.json();
        alert(err.message || "保存に失敗しました");
      }
    } catch (e) {
      console.error("保存エラー:", e);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // 削除処理
  const handleDelete = async (id: string) => {
    if (!confirm("この共有テンプレートを削除しますか？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/platform/shared-templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        refreshTemplates();
      } else {
        alert("削除に失敗しました");
      }
    } catch {
      alert("削除に失敗しました");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">共有テンプレート管理</h1>
          <p className="text-sm text-zinc-500 mt-1">テナントに共有するテンプレートを管理します</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規作成
        </button>
      </div>

      {/* フィルター */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="テンプレート名で検索..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 max-w-sm px-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">全タイプ</option>
          <option value="message">メッセージ</option>
          <option value="flex">Flex</option>
          <option value="workflow">ワークフロー</option>
        </select>
      </div>

      {/* テーブル */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-zinc-100">
          <p className="text-zinc-400">共有テンプレートがありません</p>
          <p className="text-zinc-300 text-sm mt-1">「新規作成」ボタンから追加してください</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">名前</th>
                <th className="px-4 py-3 text-left">カテゴリ</th>
                <th className="px-4 py-3 text-left">タイプ</th>
                <th className="px-4 py-3 text-left">ステータス</th>
                <th className="px-4 py-3 text-left">作成日</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-t border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-zinc-800">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-zinc-400 mt-0.5 truncate max-w-[300px]">{t.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{t.category || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[t.template_type] || "bg-zinc-100 text-zinc-600"}`}>
                      {TYPE_LABELS[t.template_type] || t.template_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.is_active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
                      {t.is_active ? "有効" : "無効"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {new Date(t.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(t)}
                        className="px-3 py-1.5 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md transition-colors"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                        className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors disabled:opacity-50"
                      >
                        {deleting === t.id ? "..." : "削除"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
              <span className="text-xs text-zinc-400">
                {pagination.total}件中 {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}件
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 text-sm border border-zinc-200 rounded disabled:opacity-30"
                >
                  前へ
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 text-sm border border-zinc-200 rounded disabled:opacity-30"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 作成・編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-zinc-800 mb-4">
                {editingId ? "共有テンプレートを編集" : "共有テンプレートを作成"}
              </h2>

              <div className="space-y-4">
                {/* 名前 */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">名前 *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="テンプレート名"
                  />
                </div>

                {/* 説明 */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">説明</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 h-20 resize-none"
                    placeholder="テンプレートの説明"
                  />
                </div>

                {/* カテゴリ */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">カテゴリ</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="例: 予約確認, リマインダー"
                  />
                </div>

                {/* タイプ */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">テンプレートタイプ</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as "message" | "flex" | "workflow")}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="message">メッセージ</option>
                    <option value="flex">Flex</option>
                    <option value="workflow">ワークフロー</option>
                  </select>
                </div>

                {/* タグ */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">タグ（カンマ区切り）</label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="例: 予約, 確認, リマインダー"
                  />
                </div>

                {/* コンテンツ */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">コンテンツ (JSON)</label>
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 h-32 resize-none font-mono"
                    placeholder='{"text": "テンプレートの内容"}'
                  />
                </div>

                {/* 有効/無効 */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-400"
                  />
                  <label htmlFor="is_active" className="text-sm text-zinc-700">有効にする</label>
                </div>
              </div>

              {/* ボタン */}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-sm border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formName}
                  className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {saving ? "保存中..." : editingId ? "更新" : "作成"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
