"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useConfirmModal } from "@/hooks/useConfirmModal";

const COLOR_OPTIONS = [
  { value: "emerald", label: "エメラルド", class: "bg-emerald-500" },
  { value: "blue", label: "ブルー", class: "bg-blue-500" },
  { value: "purple", label: "パープル", class: "bg-purple-500" },
  { value: "pink", label: "ピンク", class: "bg-pink-500" },
  { value: "amber", label: "アンバー", class: "bg-amber-500" },
  { value: "rose", label: "ローズ", class: "bg-rose-500" },
  { value: "teal", label: "ティール", class: "bg-teal-500" },
  { value: "indigo", label: "インディゴ", class: "bg-indigo-500" },
  { value: "orange", label: "オレンジ", class: "bg-orange-500" },
];

interface MedicalField {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  color_theme: string;
  sort_order: number;
  is_active: boolean;
}

interface FieldConfig {
  multiFieldEnabled: boolean;
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());

export default function MedicalFieldsSection({ onToast }: { onToast: (msg: string, type: "success" | "error") => void }) {
  const { confirm, ConfirmDialog } = useConfirmModal();
  const { data: configData, mutate: mutateConfig } = useSWR<{ ok: boolean; config: FieldConfig }>(
    "/api/admin/medical-fields/config",
    fetcher
  );
  const { data: fieldsData, mutate: mutateFields } = useSWR<{ ok: boolean; fields: MedicalField[] }>(
    "/api/admin/medical-fields",
    fetcher
  );

  const config = configData?.config ?? { multiFieldEnabled: false };
  const fields = fieldsData?.fields ?? [];

  const [toggling, setToggling] = useState(false);
  const [editingField, setEditingField] = useState<MedicalField | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // フォーム状態
  const [formSlug, setFormSlug] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColorTheme, setFormColorTheme] = useState("emerald");
  const [formSortOrder, setFormSortOrder] = useState(0);

  const resetForm = useCallback(() => {
    setFormSlug("");
    setFormName("");
    setFormDescription("");
    setFormColorTheme("emerald");
    setFormSortOrder(0);
    setEditingField(null);
    setShowAddForm(false);
  }, []);

  const startEdit = useCallback((field: MedicalField) => {
    setEditingField(field);
    setFormSlug(field.slug);
    setFormName(field.name);
    setFormDescription(field.description || "");
    setFormColorTheme(field.color_theme);
    setFormSortOrder(field.sort_order);
    setShowAddForm(true);
  }, []);

  const handleToggleMultiField = async () => {
    setToggling(true);
    try {
      const res = await fetch("/api/admin/medical-fields/config", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ multiFieldEnabled: !config.multiFieldEnabled }),
      });
      if (!res.ok) throw new Error("設定の更新に失敗しました");
      await mutateConfig();
      onToast(
        config.multiFieldEnabled ? "マルチ分野モードを無効にしました" : "マルチ分野モードを有効にしました",
        "success"
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "エラー", "error");
    } finally {
      setToggling(false);
    }
  };

  const handleSave = async () => {
    if (!formSlug.trim() || !formName.trim()) {
      onToast("スラッグと名前は必須です", "error");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...(editingField ? { id: editingField.id } : {}),
        slug: formSlug.trim(),
        name: formName.trim(),
        description: formDescription.trim() || null,
        color_theme: formColorTheme,
        sort_order: formSortOrder,
      };
      const res = await fetch("/api/admin/medical-fields", {
        method: editingField ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "保存に失敗しました");
      await mutateFields();
      resetForm();
      onToast(editingField ? "分野を更新しました" : "分野を追加しました", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "エラー", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: "分野削除", message: "この分野を削除しますか？関連データがある場合は無効化されます。", variant: "danger", confirmLabel: "削除する" });
    if (!ok) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/medical-fields?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "削除に失敗しました");
      await mutateFields();
      onToast(data.deactivated ? "関連データがあるため無効化しました" : "分野を削除しました", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "エラー", "error");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (field: MedicalField) => {
    try {
      const res = await fetch("/api/admin/medical-fields", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: field.id, is_active: !field.is_active }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      await mutateFields();
      onToast(field.is_active ? "無効にしました" : "有効にしました", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "エラー", "error");
    }
  };

  const colorClass = COLOR_OPTIONS.find((c) => c.value === formColorTheme)?.class ?? "bg-gray-500";

  return (
    <div className="space-y-6">
      {/* マルチ分野モード切り替え */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">マルチ分野モード</h3>
            <p className="text-sm text-gray-500 mt-1">
              有効にすると、患者が問診前に診療分野を選択できるようになります。
              無効の場合は現在と同じ単一分野の動作です。
            </p>
          </div>
          <button
            onClick={handleToggleMultiField}
            disabled={toggling}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              config.multiFieldEnabled ? "bg-blue-600" : "bg-gray-300"
            } ${toggling ? "opacity-50" : ""}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                config.multiFieldEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* 分野一覧 */}
      <div className={`bg-white rounded-xl border border-gray-200 ${!config.multiFieldEnabled ? "opacity-60" : ""}`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">診療分野一覧</h3>
          {config.multiFieldEnabled && (
            <button
              onClick={() => { resetForm(); setShowAddForm(true); }}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 分野を追加
            </button>
          )}
        </div>

        {!config.multiFieldEnabled && (
          <div className="p-6 text-center text-sm text-gray-500">
            マルチ分野モードを有効にすると分野を管理できます
          </div>
        )}

        {config.multiFieldEnabled && fields.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-500">
            分野がまだ登録されていません
          </div>
        )}

        {config.multiFieldEnabled && fields.map((field) => (
          <div key={field.id} className="flex items-center justify-between px-6 py-4 border-b border-gray-50 last:border-b-0">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${COLOR_OPTIONS.find((c) => c.value === field.color_theme)?.class ?? "bg-gray-400"}`} />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {field.name}
                  {!field.is_active && (
                    <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">無効</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{field.slug} · 表示順: {field.sort_order}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleActive(field)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
              >
                {field.is_active ? "無効にする" : "有効にする"}
              </button>
              <button
                onClick={() => startEdit(field)}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
              >
                編集
              </button>
              <button
                onClick={() => handleDelete(field.id)}
                disabled={deleting === field.id}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 disabled:opacity-50"
              >
                {deleting === field.id ? "..." : "削除"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 追加・編集フォーム */}
      {showAddForm && config.multiFieldEnabled && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">
            {editingField ? "分野を編集" : "分野を追加"}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">スラッグ（英数字）</label>
              <input
                type="text"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value.replace(/[^a-z0-9_]/g, ""))}
                placeholder="medical_diet"
                disabled={!!editingField}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分野名</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="メディカルダイエット"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明（任意）</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="GLP-1受容体作動薬によるメディカルダイエット"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">カラーテーマ</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setFormColorTheme(c.value)}
                    className={`w-7 h-7 rounded-full ${c.class} transition-all ${
                      formColorTheme === c.value ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "hover:scale-105"
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">表示順</label>
              <input
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(Number(e.target.value))}
                className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* プレビュー */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <span className={`w-3 h-3 rounded-full ${colorClass}`} />
            <span className="text-sm font-medium text-gray-900">{formName || "分野名"}</span>
            <span className="text-xs text-gray-500">({formSlug || "slug"})</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !formSlug.trim() || !formName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "保存中..." : editingField ? "更新" : "追加"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
