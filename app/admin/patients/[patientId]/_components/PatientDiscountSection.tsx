// 患者詳細画面の個別割引セクション
"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";

type Discount = {
  id: string;
  patient_id: string;
  product_id: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  reason: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
};

type Product = {
  id: string;
  code: string;
  title: string;
  price: number;
  is_active: boolean;
};

type Props = {
  patientId: string;
};

export function PatientDiscountSection({ patientId }: Props) {
  const apiUrl = `/api/admin/patient-discounts?patient_id=${patientId}`;
  const { data } = useSWR<{ discounts: Discount[] }>(apiUrl);
  const { data: productData } = useSWR<{ products: Product[] }>("/api/admin/products");
  const discounts = data?.discounts || [];
  const products = (productData?.products || []).filter((p) => p.is_active);

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_id: "" as string,
    discount_type: "percent" as "percent" | "fixed",
    discount_value: "",
    reason: "",
    valid_until: "",
  });

  const resetForm = () => {
    setForm({ product_id: "", discount_type: "percent", discount_value: "", reason: "", valid_until: "" });
    setFormOpen(false);
  };

  const handleAdd = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/patient-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patient_id: patientId,
          product_id: form.product_id || null,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value) || 0,
          reason: form.reason,
          valid_until: form.valid_until || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      mutate(apiUrl);
      resetForm();
    } catch (err) {
      alert(`エラー: ${err instanceof Error ? err.message : "不明"}`);
    } finally {
      setSaving(false);
    }
  }, [form, patientId, apiUrl]);

  const handleDelete = async (id: string) => {
    if (!confirm("この割引を削除しますか？")) return;
    await fetch(`/api/admin/patient-discounts?id=${id}`, { method: "DELETE", credentials: "include" });
    mutate(apiUrl);
  };

  const handleToggle = async (d: Discount) => {
    await fetch("/api/admin/patient-discounts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: d.id, is_active: !d.is_active }),
    });
    mutate(apiUrl);
  };

  const getProductName = (productId: string | null): string => {
    if (!productId) return "全商品";
    return products.find((p) => p.id === productId)?.title || productId;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">個別割引</h3>
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {formOpen ? "閉じる" : "追加"}
        </button>
      </div>

      <div className="p-4">
        {/* 追加フォーム */}
        {formOpen && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">対象商品</label>
                <select
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
                >
                  <option value="">全商品</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">割引</label>
                <div className="flex gap-1">
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "fixed" })}
                    className="px-2 py-1.5 text-xs border border-gray-300 rounded"
                  >
                    <option value="percent">%</option>
                    <option value="fixed">円</option>
                  </select>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    placeholder={form.discount_type === "percent" ? "10" : "5000"}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">理由</label>
                <input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="VIP対応、トラブル対応等"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">有効期限（空=無期限）</label>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">
                キャンセル
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.discount_value}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {saving ? "保存中..." : "追加"}
              </button>
            </div>
          </div>
        )}

        {/* 割引一覧 */}
        {discounts.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">個別割引なし</p>
        ) : (
          <div className="space-y-2">
            {discounts.map((d) => (
              <div key={d.id} className={`flex items-center justify-between p-2 rounded border ${
                d.is_active ? "border-green-200 bg-green-50/50" : "border-gray-200 bg-gray-50 opacity-60"
              }`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-800">
                      {d.discount_type === "percent" ? `${d.discount_value}%OFF` : `${d.discount_value.toLocaleString()}円引き`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {getProductName(d.product_id)}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {d.reason && <span className="mr-2">{d.reason}</span>}
                    {d.valid_until ? `〜${new Date(d.valid_until).toLocaleDateString("ja")}` : "無期限"}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(d)}
                    className="px-2 py-0.5 text-[10px] rounded border border-gray-300 text-gray-500 hover:bg-gray-100"
                  >
                    {d.is_active ? "無効化" : "有効化"}
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="px-2 py-0.5 text-[10px] rounded border border-red-200 text-red-500 hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
