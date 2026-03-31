"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

/* ---------- 型定義 ---------- */
interface ConversionPoint {
  id: number;
  name: string;
  event_type: string;
  value: number | null;
  event_count: number;
  created_at: string;
}

const EVENT_TYPES = [
  { value: "follow", label: "友だち追加" },
  { value: "reservation_made", label: "予約完了" },
  { value: "checkout_completed", label: "決済完了" },
  { value: "reorder_approved", label: "再処方承認" },
  { value: "form_submitted", label: "フォーム送信" },
];

/* ---------- ヘルパー ---------- */
function getEventTypeLabel(type: string): string {
  return EVENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

function formatCurrency(val: number): string {
  return val.toLocaleString("ja-JP");
}

/* ---------- メインページ ---------- */
const API_KEY = "/api/admin/conversions";

export default function ConversionsPage() {
  const { data, isLoading } = useSWR<{ points: ConversionPoint[] }>(API_KEY);
  const points = data?.points ?? [];

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", event_type: "follow", value: "" });
  const [saving, setSaving] = useState(false);

  /* サマリー計算 */
  const totalPoints = points.length;
  const totalEvents = points.reduce((s, p) => s + p.event_count, 0);
  const totalValue = points.reduce((s, p) => s + (p.value ?? 0) * p.event_count, 0);

  const handleCreate = () => {
    setForm({ name: "", event_type: "follow", value: "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(API_KEY, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          event_type: form.event_type,
          value: form.value ? Number(form.value) : null,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        mutate(API_KEY);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このCVポイントを削除しますか？")) return;
    await fetch(`${API_KEY}?id=${id}`, { method: "DELETE", credentials: "include" });
    mutate(API_KEY);
  };

  const closeModal = () => setShowModal(false);

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                コンバージョン管理
              </h1>
              <p className="text-sm text-gray-400 mt-1">CVポイントの設定と計測。イベントごとの成果を管理します。</p>
            </div>
            <button
              onClick={handleCreate}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-sm font-medium hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-500/25 transition-all duration-200 flex items-center gap-2 min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              CVポイント追加
            </button>
          </div>

          {/* サマリーカード */}
          {points.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-100/50">
                <div className="text-2xl font-bold text-rose-700">{totalPoints}</div>
                <div className="text-xs text-rose-500 mt-0.5">CVポイント数</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100/50">
                <div className="text-2xl font-bold text-green-700">{totalEvents.toLocaleString()}</div>
                <div className="text-xs text-green-500 mt-0.5">CV発生数</div>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100/50">
                <div className="text-2xl font-bold text-violet-700">{formatCurrency(totalValue)}円</div>
                <div className="text-xs text-violet-500 mt-0.5">合計CV金額</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CVポイント一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : points.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">CVポイントはまだありません</p>
            <p className="text-gray-300 text-xs mt-1">「CVポイント追加」からコンバージョン計測を設定しましょう</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {points.map((pt) => (
              <div
                key={pt.id}
                className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* アイコン */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-gray-900 truncate">{pt.name}</h3>
                      </div>

                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-rose-50 text-rose-700">
                          {getEventTypeLabel(pt.event_type)}
                        </span>
                        {pt.value != null && (
                          <span className="text-gray-500">
                            単価: <span className="text-gray-700 font-medium">{formatCurrency(pt.value)}円</span>
                          </span>
                        )}
                        <span className="text-gray-400">
                          発生数: <span className="text-gray-600 font-medium">{pt.event_count.toLocaleString()}件</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDelete(pt.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 作成モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  CVポイント追加
                </h2>
                <button onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* 名前 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ポイント名</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例: LINE友だち追加CV"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 bg-gray-50/50 transition-all"
                  autoFocus
                />
              </div>

              {/* イベントタイプ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">イベントタイプ</label>
                <select
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 bg-gray-50/50 transition-all"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* 金額 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">CV単価（円）<span className="text-gray-400 font-normal ml-1">任意</span></label>
                <input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder="例: 5000"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 bg-gray-50/50 transition-all"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-sm font-medium hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "保存中..." : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
