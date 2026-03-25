// キャンペーン（期間限定セール）管理画面
"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";

type Campaign = {
  id: string;
  name: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  target_type: "all" | "category" | "specific";
  target_ids: string[];
  target_category: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};

type Product = {
  id: string;
  code: string;
  title: string;
  price: number;
  category: string;
  is_active: boolean;
};

type FormData = {
  name: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: string;
  target_type: "all" | "category" | "specific";
  target_ids: string[];
  target_category: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const EMPTY_FORM: FormData = {
  name: "",
  description: "",
  discount_type: "percent",
  discount_value: "",
  target_type: "all",
  target_ids: [],
  target_category: "",
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: "",
  is_active: true,
};

export default function CampaignsPage() {
  const { data: campaignData } = useSWR<{ campaigns: Campaign[] }>("/api/admin/campaigns");
  const { data: productData } = useSWR<{ products: Product[] }>("/api/admin/products");
  const campaigns = campaignData?.campaigns || [];
  const products = (productData?.products || []).filter((p) => p.is_active);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      target_type: c.target_type,
      target_ids: c.target_ids || [],
      target_category: c.target_category || "",
      starts_at: c.starts_at ? c.starts_at.slice(0, 16) : "",
      ends_at: c.ends_at ? c.ends_at.slice(0, 16) : "",
      is_active: c.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        name: form.name.trim(),
        description: form.description.trim(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        target_type: form.target_type,
        target_ids: form.target_type === "specific" ? form.target_ids : [],
        target_category: form.target_type === "category" ? form.target_category : "",
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_active: form.is_active,
      };

      const res = await fetch("/api/admin/campaigns", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      mutate("/api/admin/campaigns");
      setModalOpen(false);
    } catch (err) {
      alert(`保存エラー: ${err instanceof Error ? err.message : "不明"}`);
    } finally {
      setSaving(false);
    }
  }, [form, editing]);

  const handleDelete = async (id: string) => {
    if (!confirm("このキャンペーンを削除しますか？")) return;
    await fetch(`/api/admin/campaigns?id=${id}`, { method: "DELETE", credentials: "include" });
    mutate("/api/admin/campaigns");
  };

  const handleToggle = async (c: Campaign) => {
    await fetch("/api/admin/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: c.id, is_active: !c.is_active }),
    });
    mutate("/api/admin/campaigns");
  };

  // キャンペーンステータス判定
  const getStatus = (c: Campaign): { label: string; color: string } => {
    if (!c.is_active) return { label: "無効", color: "bg-slate-100 text-slate-600" };
    const now = new Date();
    if (new Date(c.starts_at) > now) return { label: "予定", color: "bg-blue-100 text-blue-700" };
    if (c.ends_at && new Date(c.ends_at) < now) return { label: "終了", color: "bg-slate-100 text-slate-600" };
    return { label: "開催中", color: "bg-green-100 text-green-700" };
  };

  // カテゴリのユニーク一覧
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">キャンペーン管理</h1>
          <p className="text-slate-600 text-sm mt-1">期間限定セール・割引キャンペーンを管理</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規キャンペーン
        </button>
      </div>

      {/* キャンペーン一覧 */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
          <p className="text-lg mb-2">キャンペーンはまだありません</p>
          <p className="text-sm">「新規キャンペーン」から期間限定セールを作成できます</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const status = getStatus(c);
            return (
              <div key={c.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                    {status.label}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">{c.name}</h3>
                    <p className="text-sm text-slate-500">
                      {c.discount_type === "percent" ? `${c.discount_value}%OFF` : `${c.discount_value.toLocaleString()}円引き`}
                      {" · "}
                      {c.target_type === "all" ? "全商品" : c.target_type === "category" ? `カテゴリ: ${c.target_category}` : `${c.target_ids?.length || 0}件の商品`}
                      {" · "}
                      {new Date(c.starts_at).toLocaleDateString("ja")}
                      {c.ends_at ? ` ～ ${new Date(c.ends_at).toLocaleDateString("ja")}` : " ～ 無期限"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(c)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      c.is_active
                        ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                        : "border-green-300 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {c.is_active ? "無効化" : "有効化"}
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 作成/編集モーダル */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {editing ? "キャンペーン編集" : "新規キャンペーン"}
            </h2>

            <div className="space-y-4">
              {/* キャンペーン名 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">キャンペーン名</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例: 春の新規キャンペーン 20%OFF"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">説明（任意）</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 割引設定 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">割引タイプ</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "fixed" })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="percent">%割引</option>
                    <option value="fixed">固定額割引</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    割引値{form.discount_type === "percent" ? "（%）" : "（円）"}
                  </label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    placeholder={form.discount_type === "percent" ? "10" : "5000"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* 対象範囲 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">対象範囲</label>
                <div className="flex gap-2 mb-2">
                  {(["all", "category", "specific"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, target_type: t })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        form.target_type === t
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {t === "all" ? "全商品" : t === "category" ? "カテゴリ" : "特定商品"}
                    </button>
                  ))}
                </div>

                {form.target_type === "category" && (
                  <select
                    value={form.target_category}
                    onChange={(e) => setForm({ ...form, target_category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">カテゴリを選択</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}

                {form.target_type === "specific" && (
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                    {products.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={form.target_ids.includes(p.id)}
                          onChange={(e) => {
                            setForm({
                              ...form,
                              target_ids: e.target.checked
                                ? [...form.target_ids, p.id]
                                : form.target_ids.filter((id) => id !== p.id),
                            });
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-slate-700">{p.title}</span>
                        <span className="text-slate-400 ml-auto">{p.price.toLocaleString()}円</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 期間 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">開始日時</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">終了日時（空=無期限）</label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* 有効/無効 */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-slate-700">有効にする</span>
              </label>
            </div>

            {/* フッター */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.discount_value}
                className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                  saving || !form.name || !form.discount_value
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {saving ? "保存中..." : editing ? "更新" : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
