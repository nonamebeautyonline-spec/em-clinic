"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  FIELD_TYPE_CONFIG,
  FIELD_TYPES,
  type FieldType,
  type FieldMetadata,
  extractMetadata,
  getChoices,
} from "@/lib/custom-field-types";

interface FieldDef {
  id: number;
  name: string;
  field_type: string;
  options: string[] | FieldMetadata | null;
  sort_order: number;
}

export default function FriendFieldsPage() {
  const swrKey = "/api/admin/friend-fields";
  const { data: swrData, isLoading: loading } = useSWR(swrKey);
  const fields: FieldDef[] = swrData?.fields || [];
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<FieldDef | null>(null);
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [choicesText, setChoicesText] = useState("");
  const [numMin, setNumMin] = useState("");
  const [numMax, setNumMax] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  /** options（メタデータ）を組み立てる */
  const buildOptions = (): FieldMetadata | null => {
    const meta: FieldMetadata = {};
    let hasData = false;

    if (fieldType === "select" && choicesText.trim()) {
      meta.choices = choicesText.split(",").map(s => s.trim()).filter(Boolean);
      hasData = true;
    }

    if (fieldType === "number") {
      if (numMin !== "") { meta.min = Number(numMin); hasData = true; }
      if (numMax !== "") { meta.max = Number(numMax); hasData = true; }
    }

    if ((fieldType === "text" || fieldType === "url") && placeholder.trim()) {
      meta.placeholder = placeholder.trim();
      hasData = true;
    }

    return hasData ? meta : null;
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);

    const url = editingField ? `/api/admin/friend-fields/${editingField.id}` : "/api/admin/friend-fields";
    const method = editingField ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        field_type: fieldType,
        options: buildOptions(),
        sort_order: sortOrder,
      }),
    });

    if (res.ok) {
      await mutate(swrKey);
      resetForm();
    } else {
      const data = await res.json();
      alert((data.message || data.error) || "保存失敗");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/admin/friend-fields/${id}`, { method: "DELETE" });
    if (res.ok) {
      await mutate(swrKey);
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (f: FieldDef) => {
    setEditingField(f);
    setName(f.name);
    setFieldType((FIELD_TYPES as readonly string[]).includes(f.field_type) ? f.field_type as FieldType : "text");
    const meta = extractMetadata(f.options);
    setChoicesText(getChoices(f.options).join(", "));
    setNumMin(meta.min !== undefined ? String(meta.min) : "");
    setNumMax(meta.max !== undefined ? String(meta.max) : "");
    setPlaceholder(meta.placeholder ?? "");
    setSortOrder(f.sort_order);
    setShowModal(true);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingField(null);
    setName("");
    setFieldType("text");
    setChoicesText("");
    setNumMin("");
    setNumMax("");
    setPlaceholder("");
    setSortOrder(0);
  };

  /** フィールド一覧カードのメタデータ表示 */
  const renderFieldMeta = (f: FieldDef) => {
    const meta = extractMetadata(f.options);
    const choices = getChoices(f.options);

    return (
      <>
        {choices.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {choices.map((opt, oi) => (
              <span key={oi} className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                {opt}
              </span>
            ))}
          </div>
        )}
        {(meta.min !== undefined || meta.max !== undefined) && (
          <div className="flex gap-2 mt-1 text-[10px] text-gray-400">
            {meta.min !== undefined && <span>最小: {meta.min}</span>}
            {meta.max !== undefined && <span>最大: {meta.max}</span>}
          </div>
        )}
        {meta.placeholder && (
          <div className="mt-1 text-[10px] text-gray-300 truncate">
            プレースホルダー: {meta.placeholder}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                友達情報欄の設定
              </h1>
              <p className="text-sm text-gray-400 mt-1">患者ごとのカスタムフィールドを定義</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-teal-600 hover:to-cyan-700 shadow-lg shadow-teal-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規フィールド
            </button>
          </div>

          {/* サマリー */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-3 border border-gray-100/50 text-center">
              <div className="text-xl font-bold text-gray-700">{fields.length}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">総フィールド</div>
            </div>
            {(["text", "number", "select"] as const).map(type => {
              const cfg = FIELD_TYPE_CONFIG[type];
              const count = fields.filter(f => f.field_type === type).length;
              return (
                <div key={type} className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-3 border border-gray-100/50 text-center">
                  <div className="text-xl font-bold text-gray-700">{count}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{cfg.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* フィールド一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">情報欄がまだありません</p>
            <p className="text-gray-300 text-xs mt-1">上の「新規フィールド」ボタンから作成しましょう</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((f) => {
              const cfg = FIELD_TYPE_CONFIG[f.field_type as FieldType] || { label: f.field_type, icon: "?", color: "from-gray-400 to-gray-500" };
              return (
                <div
                  key={f.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    {/* 順序番号 */}
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                      {f.sort_order}
                    </div>

                    {/* 型アイコン */}
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-white text-sm font-bold">{cfg.icon}</span>
                    </div>

                    {/* フィールド情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 text-[15px]">{f.name}</h3>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cfg.label}</span>
                      </div>
                      {renderFieldMeta(f)}
                    </div>

                    {/* アクション */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => handleEdit(f)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(f.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 作成/編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">{editingField ? "フィールドを編集" : "新規フィールド作成"}</h2>
                <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* フィールド名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">フィールド名</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 購入回数, 担当医"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-gray-50/50 transition-all"
                  autoFocus
                />
              </div>

              {/* データ型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">データ型</label>
                <div className="grid grid-cols-3 gap-2">
                  {FIELD_TYPES.map(type => {
                    const cfg = FIELD_TYPE_CONFIG[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setFieldType(type)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          fieldType === type
                            ? "border-teal-400 bg-teal-50/50"
                            : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.color} flex items-center justify-center shadow-sm`}>
                          <span className="text-white text-sm font-bold">{cfg.icon}</span>
                        </div>
                        <span className="text-[11px] font-medium text-gray-600">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 型別の追加設定 */}
              {fieldType === "select" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">選択肢（カンマ区切り）</label>
                  <input
                    type="text"
                    value={choicesText}
                    onChange={(e) => setChoicesText(e.target.value)}
                    placeholder="例: 新規, リピーター, 休眠"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-gray-50/50 transition-all"
                  />
                  {choicesText.trim() && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {choicesText.split(",").map((opt, i) => opt.trim() && (
                        <span key={i} className="text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                          {opt.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {fieldType === "number" && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">数値の範囲（任意）</label>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">最小値</label>
                      <input
                        type="number"
                        value={numMin}
                        onChange={(e) => setNumMin(e.target.value)}
                        placeholder="制限なし"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-gray-50/50 transition-all"
                      />
                    </div>
                    <span className="text-gray-300 mt-5">~</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">最大値</label>
                      <input
                        type="number"
                        value={numMax}
                        onChange={(e) => setNumMax(e.target.value)}
                        placeholder="制限なし"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-gray-50/50 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(fieldType === "text" || fieldType === "url") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">プレースホルダー（任意）</label>
                  <input
                    type="text"
                    value={placeholder}
                    onChange={(e) => setPlaceholder(e.target.value)}
                    placeholder={fieldType === "url" ? "例: https://example.com" : "例: 自由入力テキスト"}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-gray-50/50 transition-all"
                  />
                </div>
              )}

              {/* 表示順 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">表示順</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-24 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-gray-50/50 transition-all"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button onClick={resetForm} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 disabled:opacity-40 text-sm font-medium shadow-lg shadow-teal-500/25 transition-all"
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
              <h3 className="font-bold text-gray-900 mb-1">フィールドを削除</h3>
              <p className="text-sm text-gray-500 mb-5">このフィールドを削除すると、全患者の値も削除されます。この操作は取り消せません。</p>
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
