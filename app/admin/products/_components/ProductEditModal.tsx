"use client";

import { useState, useEffect } from "react";
import type { Product } from "./types";

type FormData = {
  code: string;
  title: string;
  drug_name: string;
  dosage: string;
  duration_months: string;
  quantity: string;
  price: string;
  category: string;
  sort_order: string;
  image_url: string;
  stock_quantity: string;
  discount_price: string;
  discount_until: string;
  description: string;
  parent_id: string;
  stock_alert_threshold: string;
  stock_alert_enabled: boolean;
};

const EMPTY_FORM: FormData = {
  code: "",
  title: "",
  drug_name: "",
  dosage: "",
  duration_months: "",
  quantity: "",
  price: "",
  category: "injection",
  sort_order: "0",
  image_url: "",
  stock_quantity: "",
  discount_price: "",
  discount_until: "",
  description: "",
  parent_id: "",
  stock_alert_threshold: "",
  stock_alert_enabled: false,
};

type Props = {
  isOpen: boolean;
  editingProduct: Product | null;
  products: Product[];
  categoryId: string | null;
  onSave: () => void;
  onClose: () => void;
};

export function ProductEditModal({
  isOpen,
  editingProduct,
  products,
  categoryId,
  onSave,
  onClose,
}: Props) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (editingProduct) {
      setForm({
        code: editingProduct.code,
        title: editingProduct.title,
        drug_name: editingProduct.drug_name,
        dosage: editingProduct.dosage || "",
        duration_months: editingProduct.duration_months?.toString() || "",
        quantity: editingProduct.quantity?.toString() || "",
        price: editingProduct.price.toString(),
        category: editingProduct.category,
        sort_order: editingProduct.sort_order.toString(),
        image_url: editingProduct.image_url || "",
        stock_quantity: editingProduct.stock_quantity?.toString() || "",
        discount_price: editingProduct.discount_price?.toString() || "",
        discount_until: editingProduct.discount_until ? editingProduct.discount_until.slice(0, 10) : "",
        description: editingProduct.description || "",
        parent_id: editingProduct.parent_id || "",
        stock_alert_threshold: editingProduct.stock_alert_threshold?.toString() || "",
        stock_alert_enabled: editingProduct.stock_alert_enabled ?? false,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setSaveError("");
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handleFormChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.title.trim() || !form.price.trim()) {
      setSaveError("商品コード、商品名、価格は必須です");
      return;
    }

    setSaving(true);
    setSaveError("");

    const body: Record<string, unknown> = {
      code: form.code.trim(),
      title: form.title.trim(),
      drug_name: form.drug_name.trim(),
      dosage: form.dosage.trim() || null,
      duration_months: form.duration_months ? Number(form.duration_months) : null,
      quantity: form.quantity ? Number(form.quantity) : null,
      price: Number(form.price),
      category: form.category,
      category_id: categoryId,
      sort_order: Number(form.sort_order) || 0,
      image_url: form.image_url.trim() || null,
      stock_quantity: form.stock_quantity ? Number(form.stock_quantity) : null,
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      discount_until: form.discount_until || null,
      description: form.description.trim() || null,
      parent_id: form.parent_id || null,
      stock_alert_threshold: form.stock_alert_threshold ? Number(form.stock_alert_threshold) : null,
      stock_alert_enabled: form.stock_alert_enabled,
    };

    try {
      let res: Response;
      if (editingProduct) {
        res = await fetch("/api/admin/products", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingProduct.id, ...body }),
        });
      } else {
        res = await fetch("/api/admin/products", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "保存に失敗しました");
      }

      onSave();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg">
              {editingProduct ? "商品を編集" : "商品を追加"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{saveError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              商品コード <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => handleFormChange("code", e.target.value)}
              placeholder="例: MJ-2.5-1M"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              商品名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              placeholder="例: マンジャロ 2.5mg 1ヶ月分"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">薬品名</label>
            <input
              type="text"
              value={form.drug_name}
              onChange={(e) => handleFormChange("drug_name", e.target.value)}
              placeholder="マンジャロ"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">用量</label>
              <input
                type="text"
                value={form.dosage}
                onChange={(e) => handleFormChange("dosage", e.target.value)}
                placeholder="例: 2.5mg"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">期間（月）</label>
              <input
                type="number"
                value={form.duration_months}
                onChange={(e) => handleFormChange("duration_months", e.target.value)}
                placeholder="例: 1"
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">本数</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => handleFormChange("quantity", e.target.value)}
                placeholder="例: 4"
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                価格 (JPY) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => handleFormChange("price", e.target.value)}
                placeholder="例: 19800"
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ</label>
              <select
                value={form.category}
                onChange={(e) => handleFormChange("category", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
              >
                <option value="injection">注射</option>
                <option value="oral">内服</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">表示順</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => handleFormChange("sort_order", e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">拡張設定</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">画像URL</label>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => handleFormChange("image_url", e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            {form.image_url && (
              <div className="mt-2">
                <img
                  src={form.image_url}
                  alt="プレビュー"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">在庫数</label>
              <input
                type="number"
                value={form.stock_quantity}
                onChange={(e) => handleFormChange("stock_quantity", e.target.value)}
                placeholder="空欄=無制限"
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              <p className="text-xs text-slate-400 mt-1">空欄の場合は在庫無制限</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">親商品</label>
              <select
                value={form.parent_id}
                onChange={(e) => handleFormChange("parent_id", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
              >
                <option value="">なし（単体商品）</option>
                {products
                  .filter((p) => !p.parent_id && p.id !== editingProduct?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
              </select>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700">在庫アラート</h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.stock_alert_enabled}
                  onChange={(e) => setForm((prev) => ({ ...prev, stock_alert_enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
            {form.stock_alert_enabled && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  アラート閾値（この数以下で通知）
                </label>
                <input
                  type="number"
                  value={form.stock_alert_threshold}
                  onChange={(e) => handleFormChange("stock_alert_threshold", e.target.value)}
                  placeholder="例: 10"
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">割引価格 (JPY)</label>
              <input
                type="number"
                value={form.discount_price}
                onChange={(e) => handleFormChange("discount_price", e.target.value)}
                placeholder="空欄=割引なし"
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">割引期限</label>
              <input
                type="date"
                value={form.discount_until}
                onChange={(e) => handleFormChange("discount_until", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              <p className="text-xs text-slate-400 mt-1">空欄の場合は無期限</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">商品説明</label>
            <textarea
              value={form.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              placeholder="商品の詳細説明（任意）"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                保存中...
              </span>
            ) : editingProduct ? "更新" : "追加"}
          </button>
        </div>
      </div>
    </div>
  );
}
