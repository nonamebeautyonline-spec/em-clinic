// 定期請求プラン管理画面
"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";

type Plan = {
  id: string;
  name: string;
  product_id: string | null;
  interval_months: number;
  price: number;
  discount_percent: number;
  trial_days: number;
  max_cycles: number | null;
  gateway: "square" | "gmo";
  gateway_plan_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type Product = {
  id: string;
  code: string;
  title: string;
  price: number;
  is_active: boolean;
};

type FormData = {
  name: string;
  product_id: string;
  interval_months: string;
  price: string;
  discount_percent: string;
  trial_days: string;
  max_cycles: string;
  gateway: "square" | "gmo";
  is_active: boolean;
};

const EMPTY_FORM: FormData = {
  name: "",
  product_id: "",
  interval_months: "1",
  price: "",
  discount_percent: "0",
  trial_days: "0",
  max_cycles: "",
  gateway: "square",
  is_active: true,
};

export default function SubscriptionPlansPage() {
  const { data: planData } = useSWR<{ plans: Plan[] }>("/api/admin/subscription-plans");
  const { data: productData } = useSWR<{ products: Product[] }>("/api/admin/products");
  const plans = planData?.plans || [];
  const products = (productData?.products || []).filter((p) => p.is_active);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({
      name: p.name,
      product_id: p.product_id || "",
      interval_months: String(p.interval_months),
      price: String(p.price),
      discount_percent: String(p.discount_percent || 0),
      trial_days: String(p.trial_days || 0),
      max_cycles: p.max_cycles != null ? String(p.max_cycles) : "",
      gateway: p.gateway,
      is_active: p.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        name: form.name.trim(),
        product_id: form.product_id || null,
        interval_months: Number(form.interval_months) || 1,
        price: Number(form.price) || 0,
        discount_percent: Number(form.discount_percent) || 0,
        trial_days: Number(form.trial_days) || 0,
        max_cycles: form.max_cycles ? Number(form.max_cycles) : null,
        gateway: form.gateway,
        is_active: form.is_active,
      };

      const res = await fetch("/api/admin/subscription-plans", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      mutate("/api/admin/subscription-plans");
      setModalOpen(false);
    } catch (err) {
      alert(`保存エラー: ${err instanceof Error ? err.message : "不明"}`);
    } finally {
      setSaving(false);
    }
  }, [form, editing]);

  const handleDelete = async (id: string) => {
    if (!confirm("このプランを削除しますか？")) return;
    await fetch(`/api/admin/subscription-plans?id=${id}`, { method: "DELETE", credentials: "include" });
    mutate("/api/admin/subscription-plans");
  };

  const getProductName = (productId: string | null) => {
    if (!productId) return "-";
    return products.find((p) => p.id === productId)?.title || productId;
  };

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">定期請求プラン</h1>
          <p className="text-slate-600 text-sm mt-1">Square/GMOの定期課金プランを管理</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規プラン
        </button>
      </div>

      {/* プラン一覧 */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
          <p className="text-lg mb-2">定期請求プランはまだありません</p>
          <p className="text-sm">「新規プラン」から定期課金プランを作成できます</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <div key={p.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  p.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {p.is_active ? "有効" : "無効"}
                </span>
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-900 truncate">{p.name}</h3>
                  <p className="text-sm text-slate-500">
                    {p.price.toLocaleString()}円/{p.interval_months}ヶ月
                    {p.discount_percent > 0 && ` (${p.discount_percent}%OFF)`}
                    {" · "}
                    {p.gateway.toUpperCase()}
                    {" · "}
                    商品: {getProductName(p.product_id)}
                    {p.trial_days > 0 && ` · トライアル${p.trial_days}日`}
                    {p.max_cycles && ` · 最大${p.max_cycles}回`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEdit(p)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 作成/編集モーダル */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {editing ? "プラン編集" : "新規プラン"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">プラン名</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例: マンジャロ2.5mg 月1回コース"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">紐づく商品</label>
                <select
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">選択なし</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.title} ({p.price.toLocaleString()}円)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">請求間隔（月）</label>
                  <input
                    type="number"
                    value={form.interval_months}
                    onChange={(e) => setForm({ ...form, interval_months: e.target.value })}
                    min={1}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">定期価格（円）</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="28000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">定期割引（%）</label>
                  <input
                    type="number"
                    value={form.discount_percent}
                    onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                    min={0}
                    max={100}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">トライアル日数</label>
                  <input
                    type="number"
                    value={form.trial_days}
                    onChange={(e) => setForm({ ...form, trial_days: e.target.value })}
                    min={0}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">最大回数（空=∞）</label>
                  <input
                    type="number"
                    value={form.max_cycles}
                    onChange={(e) => setForm({ ...form, max_cycles: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">決済プロバイダー</label>
                <div className="flex gap-3">
                  {(["square", "gmo"] as const).map((gw) => (
                    <label key={gw} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer ${
                      form.gateway === gw ? "border-blue-500 bg-blue-50" : "border-slate-200"
                    }`}>
                      <input
                        type="radio"
                        name="gateway"
                        checked={form.gateway === gw}
                        onChange={() => setForm({ ...form, gateway: gw })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-medium">{gw === "square" ? "Square" : "GMO"}</span>
                    </label>
                  ))}
                </div>
              </div>

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

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.price}
                className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                  saving || !form.name || !form.price
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
