"use client";

import { useState, useEffect, useCallback } from "react";

// --- 型定義 ---
type TemplateCategory = "general" | "glp1" | "measurement" | "soap_s" | "soap_o" | "soap_a" | "soap_p";

interface KarteTemplate {
  id: number | string;
  name: string;
  category: string;
  body: string;
  sort_order: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  general: "一般",
  glp1: "GLP-1",
  measurement: "計測",
  soap_s: "SOAP - S（主訴）",
  soap_o: "SOAP - O（所見）",
  soap_a: "SOAP - A（評価）",
  soap_p: "SOAP - P（計画）",
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-700",
  glp1: "bg-blue-100 text-blue-700",
  measurement: "bg-green-100 text-green-700",
  soap_s: "bg-sky-100 text-sky-700",
  soap_o: "bg-emerald-100 text-emerald-700",
  soap_a: "bg-amber-100 text-amber-700",
  soap_p: "bg-purple-100 text-purple-700",
};

export default function KarteTemplatesPage() {
  const [templates, setTemplates] = useState<KarteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDefaults, setFromDefaults] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // フィルタ
  const [filterCategory, setFilterCategory] = useState<TemplateCategory | "">("");

  // 追加・編集フォーム
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [formName, setFormName] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formCategory, setFormCategory] = useState<TemplateCategory>("general");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  // 削除確認
  const [deleteTarget, setDeleteTarget] = useState<KarteTemplate | null>(null);

  // --- データ取得 ---
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/karte-templates", { credentials: "include" });
      if (!res.ok) throw new Error("取得に失敗しました");
      const data = await res.json();
      setTemplates(data.templates || []);
      setFromDefaults(!!data.fromDefaults);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "エラーが発生しました", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // トースト自動消去
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // --- フォーム操作 ---
  function resetForm() {
    setEditingId(null);
    setFormName("");
    setFormBody("");
    setFormCategory("general");
    setFormSortOrder(0);
    setShowForm(false);
  }

  function startAdd() {
    resetForm();
    // 新規追加時は最大sort_order + 1
    const maxOrder = templates.reduce((max, t) => Math.max(max, t.sort_order || 0), 0);
    setFormSortOrder(maxOrder + 1);
    setShowForm(true);
  }

  function startEdit(template: KarteTemplate) {
    setEditingId(template.id);
    setFormName(template.name);
    setFormBody(template.body);
    setFormCategory((template.category as TemplateCategory) || "general");
    setFormSortOrder(template.sort_order || 0);
    setShowForm(true);
  }

  // --- 保存（作成/更新） ---
  async function handleSave() {
    if (!formName.trim() || !formBody.trim()) {
      setToast({ message: "名前と内容は必須です", type: "error" });
      return;
    }

    setSaving(true);
    try {
      if (editingId !== null) {
        // 更新
        const res = await fetch("/api/admin/karte-templates", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            name: formName.trim(),
            body: formBody.trim(),
            category: formCategory,
            sort_order: formSortOrder,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "更新に失敗しました");
        }
        setToast({ message: `「${formName}」を更新しました`, type: "success" });
      } else {
        // 作成
        const res = await fetch("/api/admin/karte-templates", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            body: formBody.trim(),
            category: formCategory,
            sort_order: formSortOrder,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "作成に失敗しました");
        }
        setToast({ message: `「${formName}」を作成しました`, type: "success" });
      }

      resetForm();
      fetchTemplates();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "保存に失敗しました", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  // --- 削除（論理削除） ---
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/karte-templates?id=${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "削除に失敗しました");
      }
      setToast({ message: `「${deleteTarget.name}」を削除しました`, type: "success" });
      setDeleteTarget(null);
      fetchTemplates();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "削除に失敗しました", type: "error" });
    }
  }

  // フィルタ済みテンプレート
  const filtered = filterCategory
    ? templates.filter((t) => t.category === filterCategory)
    : templates;

  // カテゴリ別集計
  const categoryCounts = templates.reduce(
    (acc, t) => {
      const cat = t.category || "general";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">カルテテンプレート管理</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                カルテ入力時に使用する定型文テンプレートを管理します
              </p>
            </div>
            <button
              onClick={startAdd}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              テンプレート追加
            </button>
          </div>
        </div>
      </div>

      {/* トースト */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-4">
        {/* デフォルトテンプレート通知 */}
        {fromDefaults && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            現在デフォルトのテンプレートを表示しています。テンプレートを追加・編集すると、カスタムテンプレートとして保存されます。
          </div>
        )}

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs text-gray-500">総テンプレート数</p>
            <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs text-gray-500">一般</p>
            <p className="text-2xl font-bold text-gray-900">{categoryCounts["general"] || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs text-gray-500">GLP-1</p>
            <p className="text-2xl font-bold text-gray-900">{categoryCounts["glp1"] || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs text-gray-500">SOAP系</p>
            <p className="text-2xl font-bold text-gray-900">
              {(categoryCounts["soap_s"] || 0) +
                (categoryCounts["soap_o"] || 0) +
                (categoryCounts["soap_a"] || 0) +
                (categoryCounts["soap_p"] || 0)}
            </p>
          </div>
        </div>

        {/* フィルタ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 mr-1">カテゴリ:</span>
            <button
              onClick={() => setFilterCategory("")}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filterCategory === ""
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              すべて
            </button>
            {(Object.entries(CATEGORY_LABELS) as [TemplateCategory, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilterCategory(key)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  filterCategory === key
                    ? "bg-gray-900 text-white"
                    : `${CATEGORY_COLORS[key] || "bg-gray-100 text-gray-600"} hover:opacity-80`
                }`}
              >
                {label} ({categoryCounts[key] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* 追加・編集フォーム */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">
              {editingId !== null ? "テンプレート編集" : "新規テンプレート追加"}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">テンプレート名 *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="例: 初診カルテ（全文）"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as TemplateCategory)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">表示順</label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  テンプレート内容 *
                  <span className="ml-2 text-gray-400">
                    {"{{date}}"} で日時を自動挿入
                  </span>
                </label>
                <textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  rows={6}
                  placeholder="テンプレートの内容を入力してください..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono"
                />
              </div>
              {/* プレビュー */}
              {formBody && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-[10px] text-gray-400 mb-1 font-semibold">プレビュー</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {formBody.replace(
                      /\{\{date\}\}/g,
                      new Date().toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }),
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formName.trim() || !formBody.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "保存中..." : editingId !== null ? "更新" : "追加"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* テンプレート一覧 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-sm">
              <p>テンプレートがありません</p>
              <p className="mt-1 text-xs text-gray-400">
                「テンプレート追加」ボタンから新しいテンプレートを作成できます
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((template) => (
                <div
                  key={template.id}
                  className="px-5 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {template.name}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded ${
                            CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general
                          }`}
                        >
                          {CATEGORY_LABELS[template.category as TemplateCategory] || template.category}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          #{template.sort_order}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-3 font-mono">
                        {template.body}
                      </div>
                    </div>
                    {/* デフォルトテンプレートは編集・削除不可 */}
                    {typeof template.id === "number" && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(template)}
                          className="px-3 py-1.5 text-blue-600 text-xs rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => setDeleteTarget(template)}
                          className="px-3 py-1.5 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    )}
                    {typeof template.id === "string" && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded shrink-0">
                        デフォルト
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 変数一覧 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">利用可能な変数</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
              <code className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {"{{date}}"}
              </code>
              <span className="text-xs text-gray-600">
                現在の日付（例: 2026/02/23）
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-2">テンプレートを削除</h2>
            <p className="text-sm text-gray-500 mb-4">
              「{deleteTarget.name}」を削除しますか？この操作は取り消せません。
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-4 font-mono">
                {deleteTarget.body}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
