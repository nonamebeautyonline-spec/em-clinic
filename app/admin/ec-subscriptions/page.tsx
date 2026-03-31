// EC定期購入管理画面
"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";

// --- 型定義 ---
type Patient = { id: number; name: string; name_kana: string };
type Product = { id: string; title: string; price: number; code?: string };

type Subscription = {
  id: string;
  stripe_subscription_id: string | null;
  interval: string;
  status: string;
  next_billing_date: string | null;
  created_at: string;
  updated_at: string;
  patient_id: number;
  product_id: string;
  patients: Patient | null;
  products: Product | null;
};

type Stats = {
  activeCount: number;
  pausedCount: number;
  cancelledCount: number;
  mrr: number;
  churnRate: number;
};

type ApiResponse = {
  ok: boolean;
  subscriptions: Subscription[];
  total: number;
  page: number;
  limit: number;
  stats: Stats;
};

// プラン表示名
const INTERVAL_LABELS: Record<string, string> = {
  monthly: "月次",
  bimonthly: "隔月",
  quarterly: "四半期",
};

// ステータス表示
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "アクティブ", bg: "bg-emerald-100", text: "text-emerald-700" },
  paused: { label: "一時停止", bg: "bg-amber-100", text: "text-amber-700" },
  cancelled: { label: "キャンセル", bg: "bg-slate-100", text: "text-slate-600" },
};

export default function EcSubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // URLパラメータ構築
  const apiUrl = `/api/admin/ec-subscriptions?page=${page}&limit=20${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`;
  const { data, isLoading, error } = useSWR<ApiResponse>(apiUrl);

  const subscriptions = data?.subscriptions ?? [];
  const total = data?.total ?? 0;
  const stats = data?.stats ?? { activeCount: 0, pausedCount: 0, cancelledCount: 0, mrr: 0, churnRate: 0 };
  const totalPages = Math.ceil(total / 20);

  // サブスクアクション（一時停止/再開/キャンセル）
  const handleAction = useCallback(async (subId: string, action: "pause" | "resume" | "cancel") => {
    const confirmMessages: Record<string, string> = {
      pause: "この定期購入を一時停止しますか？",
      resume: "この定期購入を再開しますか？",
      cancel: "この定期購入をキャンセルしますか？この操作は取り消せません。",
    };
    if (!confirm(confirmMessages[action])) return;

    setActionLoading(subId);
    try {
      const res = await fetch(`/api/admin/ec-subscriptions/${subId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "操作に失敗しました");
      }
      mutate(apiUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作に失敗しました");
    } finally {
      setActionLoading(null);
    }
  }, [apiUrl]);

  // フィルタータブ
  const tabs = [
    { key: "all", label: "全て", count: stats.activeCount + stats.pausedCount + stats.cancelledCount },
    { key: "active", label: "アクティブ", count: stats.activeCount },
    { key: "paused", label: "一時停止", count: stats.pausedCount },
    { key: "cancelled", label: "キャンセル", count: stats.cancelledCount },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">定期購入管理</h1>
          <p className="text-slate-500 text-sm mt-1">ECサブスクリプションの管理・Stripe連携</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規登録
        </button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="アクティブサブスク"
          value={stats.activeCount.toLocaleString()}
          suffix="件"
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="月次定期収益 (MRR)"
          value={`\u00A5${stats.mrr.toLocaleString()}`}
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
        />
        <StatCard
          title="今月解約率"
          value={`${stats.churnRate}%`}
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          }
        />
      </div>

      {/* ステータスフィルタータブ */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              statusFilter === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-slate-400">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mb-2" />
            <p className="text-sm">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">
            <p className="text-sm">データの取得に失敗しました</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-lg mb-1">定期購入データがありません</p>
            <p className="text-sm">「新規登録」から手動で定期購入を登録できます</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">顧客名</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">商品名</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">プラン</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">金額</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">ステータス</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">次回請求日</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">アクション</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((sub) => {
                    const statusCfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.active;
                    const isActioning = actionLoading === sub.id;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{sub.patients?.name ?? "-"}</div>
                          {sub.patients?.name_kana && (
                            <div className="text-xs text-slate-400">{sub.patients.name_kana}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{sub.products?.title ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{INTERVAL_LABELS[sub.interval] ?? sub.interval}</td>
                        <td className="px-4 py-3 text-right text-slate-900 font-medium tabular-nums">
                          {sub.products?.price ? `\u00A5${sub.products.price.toLocaleString()}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 tabular-nums">
                          {sub.next_billing_date
                            ? new Date(sub.next_billing_date).toLocaleDateString("ja-JP")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {sub.status === "active" && (
                              <button
                                onClick={() => handleAction(sub.id, "pause")}
                                disabled={isActioning}
                                className="px-2.5 py-1 text-xs font-medium rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
                              >
                                一時停止
                              </button>
                            )}
                            {sub.status === "paused" && (
                              <button
                                onClick={() => handleAction(sub.id, "resume")}
                                disabled={isActioning}
                                className="px-2.5 py-1 text-xs font-medium rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                              >
                                再開
                              </button>
                            )}
                            {sub.status !== "cancelled" && (
                              <button
                                onClick={() => handleAction(sub.id, "cancel")}
                                disabled={isActioning}
                                className="px-2.5 py-1 text-xs font-medium rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
                              >
                                キャンセル
                              </button>
                            )}
                            {sub.status === "cancelled" && (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  全{total}件中 {(page - 1) * 20 + 1}-{Math.min(page * 20, total)}件
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 新規登録モーダル */}
      {showCreateModal && (
        <CreateSubscriptionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); mutate(apiUrl); }}
        />
      )}
    </div>
  );
}

// --- 統計カード ---
function StatCard({ title, value, suffix, icon }: { title: string; value: string; suffix?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">{title}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
      </div>
    </div>
  );
}

// --- 新規登録モーダル ---
function CreateSubscriptionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: productData } = useSWR<{ products: { id: string; title: string; price: number; is_active: boolean }[] }>("/api/admin/products");
  const products = (productData?.products ?? []).filter((p) => p.is_active);

  const [form, setForm] = useState({
    patient_id: "",
    product_id: "",
    interval: "monthly",
    stripe_subscription_id: "",
    next_billing_date: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.patient_id || !form.product_id) {
      alert("顧客IDと商品は必須です");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/ec-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patient_id: Number(form.patient_id),
          product_id: form.product_id,
          interval: form.interval,
          stripe_subscription_id: form.stripe_subscription_id || null,
          next_billing_date: form.next_billing_date || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "作成に失敗しました");
      }

      onCreated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">定期購入を手動登録</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">顧客ID (patient_id)</label>
            <input
              type="number"
              value={form.patient_id}
              onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
              placeholder="例: 12345"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">商品</label>
            <select
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">選択してください</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.price.toLocaleString()}円)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">請求間隔</label>
            <select
              value={form.interval}
              onChange={(e) => setForm({ ...form, interval: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="monthly">月次</option>
              <option value="bimonthly">隔月</option>
              <option value="quarterly">四半期</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Stripe Subscription ID（任意）
            </label>
            <input
              value={form.stripe_subscription_id}
              onChange={(e) => setForm({ ...form, stripe_subscription_id: e.target.value })}
              placeholder="sub_xxxxxxxx"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">Stripe外で管理する場合は空欄でOK</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">次回請求日（任意）</label>
            <input
              type="date"
              value={form.next_billing_date}
              onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.patient_id || !form.product_id}
            className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
              saving || !form.patient_id || !form.product_id
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {saving ? "登録中..." : "登録"}
          </button>
        </div>
      </div>
    </div>
  );
}
