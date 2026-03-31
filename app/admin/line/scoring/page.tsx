"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

/* ---------- 型定義 ---------- */
interface ScoringRule {
  id: number;
  name: string;
  event_type: string;
  score_value: number;
  is_active: boolean;
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

/* ---------- メインページ ---------- */
const API_KEY = "/api/admin/scoring";

export default function ScoringPage() {
  const { data, isLoading } = useSWR<{ rules: ScoringRule[] }>(API_KEY);
  const rules = data?.rules ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<Partial<ScoringRule> | null>(null);
  const [saving, setSaving] = useState(false);

  /* サマリー計算 */
  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.is_active).length;

  const handleCreate = () => {
    setEditRule({ name: "", event_type: "follow", score_value: 10, is_active: true });
    setShowModal(true);
  };

  const handleEdit = (rule: ScoringRule) => {
    setEditRule({ ...rule });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editRule?.name?.trim()) return;
    setSaving(true);
    try {
      const method = editRule.id ? "PUT" : "POST";
      const res = await fetch(API_KEY, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editRule),
      });
      if (res.ok) {
        setShowModal(false);
        setEditRule(null);
        mutate(API_KEY);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: ScoringRule) => {
    await fetch(API_KEY, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rule, is_active: !rule.is_active }),
    });
    mutate(API_KEY);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このスコアリングルールを削除しますか？")) return;
    await fetch(`${API_KEY}?id=${id}`, { method: "DELETE", credentials: "include" });
    mutate(API_KEY);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditRule(null);
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                スコアリング
              </h1>
              <p className="text-sm text-gray-400 mt-1">イベントごとのスコアリングルール。顧客エンゲージメントを数値化します。</p>
            </div>
            <button
              onClick={handleCreate}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-medium hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25 transition-all duration-200 flex items-center gap-2 min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              ルール追加
            </button>
          </div>

          {/* サマリーカード */}
          {rules.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100/50">
                <div className="text-2xl font-bold text-amber-700">{totalRules}</div>
                <div className="text-xs text-amber-500 mt-0.5">ルール数</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100/50">
                <div className="text-2xl font-bold text-green-700">{activeRules}</div>
                <div className="text-xs text-green-500 mt-0.5">有効なルール</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ルール一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">スコアリングルールはまだありません</p>
            <p className="text-gray-300 text-xs mt-1">「ルール追加」からスコアリングを設定しましょう</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 group ${
                  !rule.is_active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* スコアアイコン */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      rule.is_active
                        ? "bg-gradient-to-br from-amber-500 to-orange-600"
                        : "bg-gray-200"
                    }`}>
                      <span className="text-white text-xs font-bold">
                        {rule.score_value > 0 ? `+${rule.score_value}` : rule.score_value}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-gray-900 truncate">{rule.name}</h3>
                        {!rule.is_active && (
                          <span className="shrink-0 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-full font-medium">
                            無効
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">
                          {getEventTypeLabel(rule.event_type)}
                        </span>
                        <span className="text-gray-500">
                          スコア: <span className="text-amber-700 font-bold">{rule.score_value > 0 ? `+${rule.score_value}` : rule.score_value}pt</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        rule.is_active ? "bg-[#06C755]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          rule.is_active ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 作成/編集モーダル */}
      {showModal && editRule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  {editRule.id ? "ルール編集" : "ルール追加"}
                </h2>
                <button onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* ルール名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ルール名</label>
                <input
                  type="text"
                  value={editRule.name || ""}
                  onChange={(e) => setEditRule({ ...editRule, name: e.target.value })}
                  placeholder="例: 予約完了ボーナス"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 bg-gray-50/50 transition-all"
                  autoFocus
                />
              </div>

              {/* イベントタイプ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">イベントタイプ</label>
                <select
                  value={editRule.event_type || "follow"}
                  onChange={(e) => setEditRule({ ...editRule, event_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 bg-gray-50/50 transition-all"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* スコア値 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">スコア値（ポイント）</label>
                <input
                  type="number"
                  value={editRule.score_value ?? 10}
                  onChange={(e) => setEditRule({ ...editRule, score_value: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 bg-gray-50/50 transition-all"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editRule.name?.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-medium hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "保存中..." : editRule.id ? "更新" : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
