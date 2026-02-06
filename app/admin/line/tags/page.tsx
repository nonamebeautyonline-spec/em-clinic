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
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6",
  "#8B5CF6", "#EC4899", "#6B7280", "#14B8A6", "#F43F5E",
];

export default function TagManagementPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6B7280");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (!confirm("このタグを削除しますか？関連付けも全て解除されます。")) return;

    const res = await fetch(`/api/admin/tags/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) await fetchTags();
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
    setDescription(tag.description || "");
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingTag(null);
    setName("");
    setColor("#6B7280");
    setDescription("");
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">タグ管理</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + 新規タグ
        </button>
      </div>

      {/* 作成/編集フォーム */}
      {showForm && (
        <div className="mb-6 bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-3">{editingTag ? "タグを編集" : "新規タグ作成"}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タグ名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: AGA, ED, リピーター"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">色</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 ${color === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">説明（任意）</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="このタグの用途"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {saving ? "保存中..." : "保存"}
              </button>
              <button onClick={resetForm} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* タグ一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : tags.length === 0 ? (
        <div className="text-center py-12 text-gray-400">タグがまだありません</div>
      ) : (
        <div className="grid gap-3">
          {tags.map((tag) => (
            <div key={tag.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="inline-block px-3 py-1 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
                {tag.description && (
                  <span className="text-sm text-gray-500">{tag.description}</span>
                )}
                {tag.is_auto && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">自動</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(tag)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
