"use client";

import { useState, useEffect, useCallback } from "react";

// --- 型定義 ---
type Category = "drug" | "symptom" | "procedure" | "anatomy" | "lab" | "general";
type Specialty = "common" | "beauty" | "internal" | "surgery" | "orthopedics" | "dermatology";

interface VocabItem {
  id: string;
  term: string;
  reading: string | null;
  category: Category;
  specialty: Specialty;
  boost_weight: number;
  is_default: boolean;
  created_at: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  drug: "薬剤",
  symptom: "症状",
  procedure: "処置・検査",
  anatomy: "解剖",
  lab: "検査値",
  general: "その他",
};

const SPECIALTY_LABELS: Record<Specialty, string> = {
  common: "共通（全科）",
  beauty: "美容（自由診療）",
  internal: "内科",
  surgery: "外科",
  orthopedics: "整形外科",
  dermatology: "皮膚科",
};

const CATEGORY_COLORS: Record<Category, string> = {
  drug: "bg-blue-100 text-blue-700",
  symptom: "bg-red-100 text-red-700",
  procedure: "bg-purple-100 text-purple-700",
  anatomy: "bg-orange-100 text-orange-700",
  lab: "bg-green-100 text-green-700",
  general: "bg-gray-100 text-gray-600",
};

// --- メインコンポーネント ---
export default function VoiceVocabularyPage() {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // フィルタ
  const [filterCategory, setFilterCategory] = useState<Category | "">("");
  const [filterSpecialty, setFilterSpecialty] = useState<Specialty | "">("");
  const [searchQuery, setSearchQuery] = useState("");

  // 追加フォーム
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [newReading, setNewReading] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("drug");
  const [newSpecialty, setNewSpecialty] = useState<Specialty>("common");
  const [newBoost, setNewBoost] = useState(1.5);
  const [saving, setSaving] = useState(false);

  // 編集中
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTerm, setEditTerm] = useState("");
  const [editReading, setEditReading] = useState("");
  const [editCategory, setEditCategory] = useState<Category>("drug");
  const [editBoost, setEditBoost] = useState(1.5);

  // デフォルト辞書投入
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedSpecialties, setSeedSpecialties] = useState<Specialty[]>(["common", "beauty"]);
  const [seeding, setSeeding] = useState(false);

  // --- データ取得 ---
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set("category", filterCategory);
      if (filterSpecialty) params.set("specialty", filterSpecialty);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/voice/vocabulary?${params.toString()}`);
      if (!res.ok) throw new Error("取得に失敗しました");
      const data = await res.json();
      setItems(data.items || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterSpecialty, searchQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // --- 用語追加 ---
  async function handleAdd() {
    if (!newTerm.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/voice/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: newTerm.trim(),
          reading: newReading.trim() || undefined,
          category: newCategory,
          specialty: newSpecialty,
          boost_weight: newBoost,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || "追加に失敗しました", type: "error" });
        return;
      }
      setToast({ message: `「${newTerm}」を追加しました`, type: "success" });
      setNewTerm("");
      setNewReading("");
      setShowAddForm(false);
      fetchItems();
    } catch {
      setToast({ message: "通信エラー", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  // --- 用語更新 ---
  async function handleUpdate(id: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/voice/vocabulary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          term: editTerm.trim(),
          reading: editReading.trim() || null,
          category: editCategory,
          boost_weight: editBoost,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setToast({ message: data.error || "更新に失敗しました", type: "error" });
        return;
      }
      setToast({ message: "更新しました", type: "success" });
      setEditingId(null);
      fetchItems();
    } catch {
      setToast({ message: "通信エラー", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  // --- 用語削除 ---
  async function handleDelete(id: string, term: string) {
    if (!confirm(`「${term}」を削除しますか？`)) return;
    try {
      const res = await fetch("/api/admin/voice/vocabulary", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        setToast({ message: "削除に失敗しました", type: "error" });
        return;
      }
      setToast({ message: `「${term}」を削除しました`, type: "success" });
      fetchItems();
    } catch {
      setToast({ message: "通信エラー", type: "error" });
    }
  }

  // --- デフォルト辞書一括投入 ---
  async function handleSeed() {
    if (seedSpecialties.length === 0) return;
    if (!confirm(`選択した診療科のデフォルト辞書を投入します。\n既存のデフォルト辞書は置き換えられます。よろしいですか？`)) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/voice/vocabulary?action=seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialties: seedSpecialties }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || "投入に失敗しました", type: "error" });
        return;
      }
      setToast({ message: data.message || "デフォルト辞書を登録しました", type: "success" });
      setShowSeedModal(false);
      fetchItems();
    } catch {
      setToast({ message: "通信エラー", type: "error" });
    } finally {
      setSeeding(false);
    }
  }

  // 編集開始
  function startEdit(item: VocabItem) {
    setEditingId(item.id);
    setEditTerm(item.term);
    setEditReading(item.reading || "");
    setEditCategory(item.category);
    setEditBoost(item.boost_weight);
  }

  // seedSpecialties トグル
  function toggleSeedSpecialty(sp: Specialty) {
    setSeedSpecialties((prev) =>
      prev.includes(sp) ? prev.filter((s) => s !== sp) : [...prev, sp]
    );
  }

  // カテゴリ別集計
  const categoryCounts = items.reduce(
    (acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">医療辞書管理</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                音声認識の精度を向上させる医療用語辞書を管理します
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSeedModal(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                デフォルト辞書投入
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                用語追加
              </button>
            </div>
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
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* エラーバナー */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-4">
        {/* 追加フォーム */}
        {showAddForm && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">新規用語追加</h2>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">用語 *</label>
                <input
                  type="text"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="例: マンジャロ"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">読み</label>
                <input
                  type="text"
                  value={newReading}
                  onChange={(e) => setNewReading(e.target.value)}
                  placeholder="まんじゃろ"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as Category)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">診療科</label>
                <select
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value as Specialty)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(SPECIALTY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">重み ({newBoost})</label>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={newBoost}
                  onChange={(e) => setNewBoost(Number(e.target.value))}
                  className="w-full mt-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !newTerm.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "追加中..." : "追加"}
              </button>
            </div>
          </div>
        )}

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs text-gray-500">総用語数</p>
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          </div>
          {Object.entries(CATEGORY_LABELS).slice(0, 3).map(([key, label]) => (
            <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{categoryCounts[key] || 0}</p>
            </div>
          ))}
        </div>

        {/* フィルタ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="用語を検索..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as Category | "")}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全カテゴリ</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value as Specialty | "")}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全診療科</option>
              {Object.entries(SPECIALTY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 用語一覧テーブル */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-sm">
              <p>用語が登録されていません</p>
              <p className="mt-1 text-xs text-gray-400">
                「デフォルト辞書投入」で診療科のプリセット辞書を一括登録できます
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">用語</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">読み</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">カテゴリ</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">診療科</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">重み</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">種別</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      {editingId === item.id ? (
                        // 編集モード
                        <>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={editTerm}
                              onChange={(e) => setEditTerm(e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={editReading}
                              onChange={(e) => setEditReading(e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value as Category)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded"
                            >
                              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-xs">
                            {SPECIALTY_LABELS[item.specialty]}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="1.0"
                              max="3.0"
                              step="0.1"
                              value={editBoost}
                              onChange={(e) => setEditBoost(Number(e.target.value))}
                              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleUpdate(item.id)}
                                disabled={saving}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1 text-gray-500 text-xs rounded hover:bg-gray-100"
                              >
                                取消
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        // 表示モード
                        <>
                          <td className="px-4 py-3 font-medium text-gray-900">{item.term}</td>
                          <td className="px-4 py-3 text-gray-500">{item.reading || "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${CATEGORY_COLORS[item.category]}`}>
                              {CATEGORY_LABELS[item.category]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {SPECIALTY_LABELS[item.specialty]}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-gray-600">{item.boost_weight}</span>
                          </td>
                          <td className="px-4 py-3">
                            {item.is_default ? (
                              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-700">
                                デフォルト
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                                カスタム
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => startEdit(item)}
                                className="px-3 py-1 text-blue-600 text-xs rounded hover:bg-blue-50"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => handleDelete(item.id, item.term)}
                                className="px-3 py-1 text-red-600 text-xs rounded hover:bg-red-50"
                              >
                                削除
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* デフォルト辞書投入モーダル */}
      {showSeedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">デフォルト辞書投入</h2>
            <p className="text-sm text-gray-500 mb-4">
              選択した診療科のプリセット用語を一括登録します。既存のデフォルト辞書（カスタム用語は除く）は置き換えられます。
            </p>

            <div className="space-y-2 mb-6">
              {(Object.entries(SPECIALTY_LABELS) as [Specialty, string][]).map(([key, label]) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                    seedSpecialties.includes(key)
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={seedSpecialties.includes(key)}
                    onChange={() => toggleSeedSpecialty(key)}
                    disabled={key === "common"}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    {key === "common" && (
                      <p className="text-xs text-gray-400">常に含まれます</p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSeedModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSeed}
                disabled={seeding || seedSpecialties.length === 0}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {seeding ? "投入中..." : "一括登録"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
