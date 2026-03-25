// クーポン管理画面
"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";

type Coupon = {
  id: number;
  name: string;
  code: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  max_uses_per_patient: number;
  valid_from: string;
  valid_until: string | null;
  description: string;
  is_active: boolean;
  created_at: string;
  issued_count: number;
  used_count: number;
};

type FormData = {
  name: string;
  code: string;
  discount_type: "fixed" | "percent";
  discount_value: string;
  min_purchase: string;
  max_uses: string;
  max_uses_per_patient: string;
  valid_from: string;
  valid_until: string;
  description: string;
  is_active: boolean;
};

const EMPTY_FORM: FormData = {
  name: "",
  code: "",
  discount_type: "fixed",
  discount_value: "",
  min_purchase: "0",
  max_uses: "",
  max_uses_per_patient: "1",
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: "",
  description: "",
  is_active: true,
};

export default function CouponsPage() {
  const { data } = useSWR<{ coupons: Coupon[] }>("/api/admin/line/coupons");
  const coupons = data?.coupons || [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      name: c.name,
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_purchase: String(c.min_purchase || 0),
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
      max_uses_per_patient: String(c.max_uses_per_patient || 1),
      valid_from: c.valid_from ? c.valid_from.slice(0, 10) : "",
      valid_until: c.valid_until ? c.valid_until.slice(0, 10) : "",
      description: c.description || "",
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
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        min_purchase: Number(form.min_purchase) || 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        max_uses_per_patient: Number(form.max_uses_per_patient) || 1,
        valid_from: form.valid_from || new Date().toISOString(),
        valid_until: form.valid_until || null,
        description: form.description,
        is_active: form.is_active,
      };

      const res = await fetch("/api/admin/line/coupons", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      mutate("/api/admin/line/coupons");
      setModalOpen(false);
    } catch (err) {
      alert(`保存エラー: ${err instanceof Error ? err.message : "不明"}`);
    } finally {
      setSaving(false);
    }
  }, [form, editing]);

  const handleDelete = async (id: number) => {
    if (!confirm("このクーポンを削除しますか？")) return;
    await fetch(`/api/admin/line/coupons?id=${id}`, { method: "DELETE", credentials: "include" });
    mutate("/api/admin/line/coupons");
  };

  // ステータス判定
  const getStatus = (c: Coupon): { label: string; color: string } => {
    if (!c.is_active) return { label: "無効", color: "bg-slate-100 text-slate-600" };
    const now = new Date();
    if (c.valid_until && new Date(c.valid_until) < now) return { label: "期限切れ", color: "bg-slate-100 text-slate-600" };
    if (c.max_uses && c.used_count >= c.max_uses) return { label: "上限到達", color: "bg-amber-100 text-amber-700" };
    return { label: "有効", color: "bg-green-100 text-green-700" };
  };

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">クーポン管理</h1>
          <p className="text-slate-600 text-sm mt-1">クーポンコードの作成・管理・配布状況を確認</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規クーポン
        </button>
      </div>

      {/* クーポン一覧 */}
      {coupons.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
          <p className="text-lg mb-2">クーポンはまだありません</p>
          <p className="text-sm">「新規クーポン」からクーポンコードを作成できます</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">状態</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">クーポン名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">コード</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">割引</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">利用</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">有効期間</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((c) => {
                const status = getStatus(c);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{c.name}</td>
                    <td className="px-4 py-3">
                      <code className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">{c.code}</code>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {c.discount_type === "percent" ? `${c.discount_value}%OFF` : `${c.discount_value.toLocaleString()}円引き`}
                      {c.min_purchase > 0 && <span className="text-xs text-slate-400 ml-1">({c.min_purchase.toLocaleString()}円以上)</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-slate-700">{c.used_count}</span>
                      <span className="text-slate-400">/{c.max_uses ?? "∞"}</span>
                      <span className="text-xs text-slate-400 ml-1">(配布{c.issued_count})</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.valid_from ? new Date(c.valid_from).toLocaleDateString("ja") : "-"}
                      {" ～ "}
                      {c.valid_until ? new Date(c.valid_until).toLocaleDateString("ja") : "無期限"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 作成/編集モーダル */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {editing ? "クーポン編集" : "新規クーポン"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">クーポン名</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例: 春の新規割引クーポン"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">クーポンコード</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="例: SPRING2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">割引タイプ</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as "fixed" | "percent" })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="fixed">固定額割引</option>
                    <option value="percent">%割引</option>
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">最低購入金額</label>
                <input
                  type="number"
                  value={form.min_purchase}
                  onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">全体利用上限（空=無制限）</label>
                  <input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">1人あたり利用上限</label>
                  <input
                    type="number"
                    value={form.max_uses_per_patient}
                    onChange={(e) => setForm({ ...form, max_uses_per_patient: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">有効開始日</label>
                  <input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">有効終了日（空=無期限）</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">説明（任意）</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
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
                disabled={saving || !form.name || !form.code || !form.discount_value}
                className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                  saving || !form.name || !form.code || !form.discount_value
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
