"use client";
// SALON: 施術メニュー管理ページ

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";

// --- 型定義 ---
interface TreatmentCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface TreatmentMenu {
  id: string;
  name: string;
  category_id: string | null;
  duration_min: number | null;
  price: number;
  description: string | null;
  photo_url: string | null;
  is_active: boolean;
  sort_order: number;
  treatment_categories: { id: string; name: string } | null;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

// --- メインページ ---
export default function TreatmentsPage() {
  const { data: menuData, mutate: mutateMenus } = useSWR<{ menus: TreatmentMenu[] }>(
    "/api/admin/treatments",
    fetcher,
  );
  const { data: catData, mutate: mutateCats } = useSWR<{ categories: TreatmentCategory[] }>(
    "/api/admin/treatment-categories",
    fetcher,
  );

  const [selectedCat, setSelectedCat] = useState<string | null>(null); // null = 全て
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [editingMenu, setEditingMenu] = useState<TreatmentMenu | null>(null);
  const [editingCat, setEditingCat] = useState<TreatmentCategory | null>(null);

  const categories = catData?.categories ?? [];
  const allMenus = menuData?.menus ?? [];

  // アクティブなメニューのみ、カテゴリフィルタ
  const filteredMenus = useMemo(() => {
    const active = allMenus.filter((m) => m.is_active);
    if (!selectedCat) return active;
    return active.filter((m) => m.category_id === selectedCat);
  }, [allMenus, selectedCat]);

  // --- メニュー保存 ---
  const handleSaveMenu = useCallback(
    async (formData: Partial<TreatmentMenu>) => {
      if (editingMenu) {
        await fetch(`/api/admin/treatments/${editingMenu.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/admin/treatments", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      mutateMenus();
      setShowMenuDialog(false);
      setEditingMenu(null);
    },
    [editingMenu, mutateMenus],
  );

  // --- メニュー削除（論理削除） ---
  const handleDeleteMenu = useCallback(
    async (id: string) => {
      if (!confirm("このメニューを無効化しますか？")) return;
      await fetch(`/api/admin/treatments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      mutateMenus();
    },
    [mutateMenus],
  );

  // --- カテゴリ保存 ---
  const handleSaveCat = useCallback(
    async (formData: { id?: string; name: string; sort_order: number }) => {
      if (formData.id) {
        await fetch("/api/admin/treatment-categories", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/admin/treatment-categories", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      mutateCats();
      setShowCatDialog(false);
      setEditingCat(null);
    },
    [mutateCats],
  );

  // --- カテゴリ削除 ---
  const handleDeleteCat = useCallback(
    async (id: string) => {
      if (!confirm("このカテゴリを削除しますか？\n（紐づくメニューのカテゴリは未設定になります）")) return;
      await fetch(`/api/admin/treatment-categories?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      mutateCats();
      if (selectedCat === id) setSelectedCat(null);
    },
    [mutateCats, selectedCat],
  );

  const fmt = (n: number) => new Intl.NumberFormat("ja-JP").format(n);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">施術メニュー</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingCat(null); setShowCatDialog(true); }}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
          >
            カテゴリ管理
          </button>
          <button
            onClick={() => { setEditingMenu(null); setShowMenuDialog(true); }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            + メニュー追加
          </button>
        </div>
      </div>

      {/* カテゴリタブ */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedCat(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !selectedCat
              ? "bg-purple-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          全て
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCat === cat.id
                ? "bg-purple-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* メニューカードグリッド */}
      {filteredMenus.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">メニューがありません。「+ メニュー追加」から作成してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenus.map((menu) => (
            <div
              key={menu.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-base">{menu.name}</h3>
                <div className="flex gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => { setEditingMenu(menu); setShowMenuDialog(true); }}
                    className="p-1 text-slate-400 hover:text-purple-600"
                    title="編集"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button
                    onClick={() => handleDeleteMenu(menu.id)}
                    className="p-1 text-slate-400 hover:text-red-500"
                    title="無効化"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              {menu.treatment_categories && (
                <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full mb-2">
                  {menu.treatment_categories.name}
                </span>
              )}
              <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                {menu.duration_min != null && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {menu.duration_min}分
                  </span>
                )}
                <span className="font-semibold text-slate-900">¥{fmt(menu.price)}</span>
              </div>
              {menu.description && (
                <p className="text-sm text-slate-500 line-clamp-2">{menu.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* メニュー追加/編集ダイアログ */}
      {showMenuDialog && (
        <MenuDialog
          categories={categories}
          initial={editingMenu}
          onSave={handleSaveMenu}
          onClose={() => { setShowMenuDialog(false); setEditingMenu(null); }}
        />
      )}

      {/* カテゴリ管理ダイアログ */}
      {showCatDialog && (
        <CategoryDialog
          categories={categories}
          editingCat={editingCat}
          onEdit={setEditingCat}
          onSave={handleSaveCat}
          onDelete={handleDeleteCat}
          onClose={() => { setShowCatDialog(false); setEditingCat(null); }}
        />
      )}
    </div>
  );
}

// --- メニュー追加/編集ダイアログ ---
function MenuDialog({
  categories,
  initial,
  onSave,
  onClose,
}: {
  categories: TreatmentCategory[];
  initial: TreatmentMenu | null;
  onSave: (data: Partial<TreatmentMenu>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [durationMin, setDurationMin] = useState(initial?.duration_min?.toString() ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name,
      category_id: categoryId || null,
      duration_min: durationMin ? parseInt(durationMin, 10) : null,
      price: price ? parseInt(price, 10) : 0,
      description: description || null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          {initial ? "メニュー編集" : "メニュー追加"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">メニュー名 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="カット"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">未設定</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">所要時間（分）</label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="60"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">料金（円）</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="5000"
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="施術内容の説明..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving || !name}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- カテゴリ管理ダイアログ ---
function CategoryDialog({
  categories,
  editingCat,
  onEdit,
  onSave,
  onDelete,
  onClose,
}: {
  categories: TreatmentCategory[];
  editingCat: TreatmentCategory | null;
  onEdit: (cat: TreatmentCategory | null) => void;
  onSave: (data: { id?: string; name: string; sort_order: number }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  // 編集モード切替時にフォームを更新
  const startEdit = (cat: TreatmentCategory) => {
    onEdit(cat);
    setName(cat.name);
    setSortOrder(cat.sort_order.toString());
  };

  const resetForm = () => {
    onEdit(null);
    setName("");
    setSortOrder("0");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    await onSave({
      id: editingCat?.id,
      name,
      sort_order: parseInt(sortOrder, 10) || 0,
    });
    resetForm();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900 mb-4">カテゴリ管理</h2>

        {/* 既存カテゴリ一覧 */}
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {categories.length === 0 && (
            <p className="text-sm text-slate-400">カテゴリがありません</p>
          )}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center justify-between p-2 rounded-lg ${
                editingCat?.id === cat.id ? "bg-purple-50 border border-purple-200" : "bg-slate-50"
              }`}
            >
              <span className="text-sm font-medium text-slate-700">{cat.name}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(cat)}
                  className="p-1 text-slate-400 hover:text-purple-600 text-xs"
                >
                  編集
                </button>
                <button
                  onClick={() => onDelete(cat.id)}
                  className="p-1 text-slate-400 hover:text-red-500 text-xs"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 追加/編集フォーム */}
        <form onSubmit={handleSubmit} className="border-t border-slate-200 pt-4 space-y-3">
          <p className="text-sm font-medium text-slate-600">
            {editingCat ? "カテゴリ編集" : "カテゴリ追加"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="カテゴリ名"
                required
              />
            </div>
            <div>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="順序"
              />
            </div>
          </div>
          <div className="flex justify-between">
            {editingCat && (
              <button type="button" onClick={resetForm} className="text-xs text-slate-500 hover:text-slate-700">
                新規追加に切替
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                閉じる
              </button>
              <button
                type="submit"
                disabled={saving || !name}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : editingCat ? "更新" : "追加"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
