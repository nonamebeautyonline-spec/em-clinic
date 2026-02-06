"use client";

import { useState, useEffect } from "react";

interface FieldDef {
  id: number;
  name: string;
  field_type: string;
  options: string[] | null;
  sort_order: number;
}

export default function FriendFieldsPage() {
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingField, setEditingField] = useState<FieldDef | null>(null);
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [options, setOptions] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchFields = async () => {
    const res = await fetch("/api/admin/friend-fields", { credentials: "include" });
    const data = await res.json();
    if (data.fields) setFields(data.fields);
    setLoading(false);
  };

  useEffect(() => { fetchFields(); }, []);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);

    const url = editingField ? `/api/admin/friend-fields/${editingField.id}` : "/api/admin/friend-fields";
    const method = editingField ? "PUT" : "POST";

    const parsedOptions = fieldType === "select" && options.trim()
      ? options.split(",").map(s => s.trim()).filter(Boolean)
      : null;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: name.trim(),
        field_type: fieldType,
        options: parsedOptions,
        sort_order: sortOrder,
      }),
    });

    if (res.ok) {
      await fetchFields();
      resetForm();
    } else {
      const data = await res.json();
      alert(data.error || "保存失敗");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この情報欄を削除しますか？全患者の値も削除されます。")) return;
    const res = await fetch(`/api/admin/friend-fields/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) await fetchFields();
  };

  const handleEdit = (f: FieldDef) => {
    setEditingField(f);
    setName(f.name);
    setFieldType(f.field_type);
    setOptions(f.options ? f.options.join(", ") : "");
    setSortOrder(f.sort_order);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingField(null);
    setName("");
    setFieldType("text");
    setOptions("");
    setSortOrder(0);
  };

  const typeLabels: Record<string, string> = {
    text: "テキスト",
    number: "数値",
    date: "日付",
    select: "選択肢",
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">友達情報欄の設定</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + 新規フィールド
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-3">{editingField ? "フィールドを編集" : "新規フィールド作成"}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">フィールド名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 購入回数, 担当医"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">データ型</label>
              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">テキスト</option>
                <option value="number">数値</option>
                <option value="date">日付</option>
                <option value="select">選択肢</option>
              </select>
            </div>
            {fieldType === "select" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">選択肢（カンマ区切り）</label>
                <input
                  type="text"
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder="例: 新規, リピーター, 休眠"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">表示順</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-24 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : fields.length === 0 ? (
        <div className="text-center py-12 text-gray-400">情報欄がまだありません</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">順序</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">フィールド名</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">型</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">選択肢</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{f.sort_order}</td>
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3">{typeLabels[f.field_type] || f.field_type}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {f.options ? (f.options as string[]).join(", ") : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(f)} className="text-blue-600 hover:text-blue-800 mr-3">編集</button>
                    <button onClick={() => handleDelete(f.id)} className="text-red-600 hover:text-red-800">削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
