"use client";

import { useState, useEffect } from "react";

interface Tag {
  id: number;
  name: string;
  color: string;
  description: string | null;
  is_auto: boolean;
  created_at: string;
}

const PRESET_COLORS = [
  { hex: "#EF4444", name: "レッド" },
  { hex: "#F97316", name: "オレンジ" },
  { hex: "#EAB308", name: "イエロー" },
  { hex: "#22C55E", name: "グリーン" },
  { hex: "#14B8A6", name: "ティール" },
  { hex: "#3B82F6", name: "ブルー" },
  { hex: "#8B5CF6", name: "パープル" },
  { hex: "#EC4899", name: "ピンク" },
  { hex: "#F43F5E", name: "ローズ" },
  { hex: "#6B7280", name: "グレー" },
];

export default function TagManagementPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchTags = async () => {
    const res = await fetch("/api/admin/tags", { credentials: "include" });
    const data = await res.json();
    if (data.tags) setTags(data.tags);
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);

    const url = editingTag ? `/api/admin/tags/${editingTag.id}` : "/api/admin/tags";
    const method = editingTag ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim(), color, description: description.trim() || null }),
    });

    if (res.ok) {
      await fetchTags();
      resetForm();
    } else {
      const data = await res.json();
      alert(data.error || "保存失敗");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/admin/tags/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      await fetchTags();
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
    setDescription(tag.description || "");
    setShowModal(true);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingTag(null);
    setName("");
    setColor("#3B82F6");
    setDescription("");
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                タグ管理
              </h1>
              <p className="text-sm text-gray-400 mt-1">患者の分類・セグメント配信に使用するタグを管理</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規タグ
            </button>
          </div>

          {/* サマリーカード */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100/50">
              <div className="text-2xl font-bold text-violet-700">{tags.length}</div>
              <div className="text-xs text-violet-500 mt-0.5">タグ総数</div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100/50">
              <div className="text-2xl font-bold text-amber-700">{tags.filter(t => t.is_auto).length}</div>
              <div className="text-xs text-amber-500 mt-0.5">自動タグ</div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-100/50">
              <div className="text-2xl font-bold text-gray-700">{tags.filter(t => !t.is_auto).length}</div>
              <div className="text-xs text-gray-500 mt-0.5">手動タグ</div>
            </div>
          </div>
        </div>
      </div>

      {/* タグ一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">タグがまだありません</p>
            <p className="text-gray-300 text-xs mt-1">上の「新規タグ」ボタンからタグを作成しましょう</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-offset-2 flex-shrink-0"
                      style={{ backgroundColor: tag.color, outlineColor: tag.color + "40" }}
                    />
                    <span className="font-semibold text-gray-900 text-[15px]">{tag.name}</span>
                  </div>
                  {tag.is_auto && (
                    <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium border border-amber-100">自動</span>
                  )}
                </div>

                {tag.description && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">{tag.description}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(tag)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(tag.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 作成/編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* モーダルヘッダー */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">{editingTag ? "タグを編集" : "新規タグ作成"}</h2>
                <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* プレビュー */}
              <div className="flex justify-center">
                <span
                  className="inline-flex items-center px-4 py-1.5 rounded-lg text-sm font-medium text-white shadow-sm transition-all"
                  style={{ backgroundColor: color }}
                >
                  {name || "タグ名"}
                </span>
              </div>

              {/* タグ名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">タグ名</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: AGA, ED, リピーター"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 bg-gray-50/50 transition-all"
                  autoFocus
                />
              </div>

              {/* 色選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">カラー</label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setColor(c.hex)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-150 ${
                        color === c.hex
                          ? "bg-gray-100 ring-2 ring-offset-1"
                          : "hover:bg-gray-50"
                      }`}
                      style={{ outlineColor: color === c.hex ? c.hex : undefined }}
                    >
                      <div
                        className={`w-7 h-7 rounded-full transition-transform ${color === c.hex ? "scale-110 shadow-md" : ""}`}
                        style={{ backgroundColor: c.hex, boxShadow: color === c.hex ? `0 4px 12px ${c.hex}40` : undefined }}
                      />
                      <span className="text-[10px] text-gray-400">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">説明（任意）</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="このタグの用途を入力"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 bg-gray-50/50 transition-all"
                />
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={resetForm} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 disabled:opacity-40 text-sm font-medium shadow-lg shadow-violet-500/25 transition-all"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    保存中...
                  </span>
                ) : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">タグを削除</h3>
              <p className="text-sm text-gray-500 mb-5">このタグを削除すると、全患者との関連付けも解除されます。この操作は取り消せません。</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors">
                  キャンセル
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium shadow-lg shadow-red-500/25 transition-all"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
