"use client";

import { useState, useEffect, useCallback } from "react";

/* ---------- 型定義 ---------- */
interface ReminderRule {
  id: number;
  name: string;
  timing_type: "before_hours" | "before_days";
  timing_value: number;
  message_template: string;
  is_enabled: boolean;
  sent_count: number;
  created_at: string;
}

const TIMING_TYPES = [
  { value: "before_hours", label: "時間前" },
  { value: "before_days", label: "日前" },
];

const TEMPLATE_VARS = [
  { var: "{name}", desc: "患者名" },
  { var: "{date}", desc: "予約日" },
  { var: "{time}", desc: "予約時刻" },
  { var: "{patient_id}", desc: "患者ID" },
];

const DEFAULT_TEMPLATE = `{name}様

明日のご予約についてお知らせいたします。

予約日時: {date} {time}

ご来院をお待ちしております。
変更・キャンセルはお早めにご連絡ください。`;

/* ---------- メインページ ---------- */
export default function ReminderRulesPage() {
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<Partial<ReminderRule> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/line/reminder-rules", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setRules(d.rules || []);
      }
    } catch (e) {
      console.error("データ取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => {
    setEditRule({ name: "", timing_type: "before_hours", timing_value: 24, message_template: DEFAULT_TEMPLATE, is_enabled: true });
    setShowModal(true);
  };

  const handleEdit = (rule: ReminderRule) => {
    setEditRule({ ...rule });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editRule) return;
    setSaving(true);
    try {
      const method = editRule.id ? "PUT" : "POST";
      const res = await fetch("/api/admin/line/reminder-rules", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editRule),
      });
      if (res.ok) {
        setShowModal(false);
        setEditRule(null);
        loadData();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: ReminderRule) => {
    await fetch("/api/admin/line/reminder-rules", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rule, is_enabled: !rule.is_enabled }),
    });
    loadData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このリマインドルールを削除しますか？")) return;
    await fetch(`/api/admin/line/reminder-rules?id=${id}`, { method: "DELETE", credentials: "include" });
    loadData();
  };

  const closeModal = () => { setShowModal(false); setEditRule(null); };
  const totalSent = rules.reduce((sum, r) => sum + r.sent_count, 0);
  const activeCount = rules.filter(r => r.is_enabled).length;

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                予約リマインド
              </h1>
              <p className="text-sm text-gray-400 mt-1">予約のN時間前/N日前にLINEで自動通知。無断キャンセルを防止します。</p>
            </div>
            <button
              onClick={handleCreate}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-sky-600 hover:to-blue-700 shadow-lg shadow-sky-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新しいルール
            </button>
          </div>

          {/* サマリーカード */}
          {rules.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-100/50">
                <div className="text-2xl font-bold text-sky-700">{rules.length}</div>
                <div className="text-xs text-sky-500 mt-0.5">ルール数</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100/50">
                <div className="text-2xl font-bold text-green-700">{activeCount}</div>
                <div className="text-xs text-green-500 mt-0.5">稼働中</div>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100/50">
                <div className="text-2xl font-bold text-violet-700">{totalSent}</div>
                <div className="text-xs text-violet-500 mt-0.5">送信実績</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ルール一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">リマインドルールはまだありません</p>
            <p className="text-gray-300 text-xs mt-1">「新しいルール」から予約リマインドを設定しましょう</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 group ${
                  !rule.is_enabled ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* タイミングアイコン */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      rule.is_enabled
                        ? "bg-gradient-to-br from-sky-500 to-blue-600"
                        : "bg-gray-200"
                    }`}>
                      <span className="text-white text-xs font-bold">
                        {rule.timing_value}{rule.timing_type === "before_hours" ? "h" : "d"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-gray-900 truncate">{rule.name}</h3>
                        {!rule.is_enabled && (
                          <span className="shrink-0 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-full font-medium">
                            停止中
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] mb-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          予約の {rule.timing_value}{rule.timing_type === "before_hours" ? "時間" : "日"}前
                        </span>
                        <span className="text-gray-400">
                          送信実績: <span className="text-gray-600 font-medium">{rule.sent_count}件</span>
                        </span>
                      </div>

                      {/* メッセージプレビュー */}
                      <div className="bg-gray-50/80 rounded-lg p-3 text-[11px] text-gray-500 whitespace-pre-wrap line-clamp-2 leading-relaxed border border-gray-100/50">
                        {rule.message_template}
                      </div>
                    </div>
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="px-3 py-1.5 text-xs font-medium text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
                        rule.is_enabled ? "bg-[#06C755]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          rule.is_enabled ? "translate-x-5" : "translate-x-0.5"
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
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  {editRule.id ? "ルール編集" : "新しいリマインドルール"}
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
                  onChange={e => setEditRule({ ...editRule, name: e.target.value })}
                  placeholder="例: 予約24時間前リマインド"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-gray-50/50 transition-all"
                  autoFocus
                />
              </div>

              {/* タイミング */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">送信タイミング</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">予約の</span>
                  <input
                    type="number"
                    min={1}
                    value={editRule.timing_value ?? 24}
                    onChange={e => setEditRule({ ...editRule, timing_value: parseInt(e.target.value) || 1 })}
                    className="w-20 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-gray-50/50 transition-all"
                  />
                  <select
                    value={editRule.timing_type || "before_hours"}
                    onChange={e => setEditRule({ ...editRule, timing_type: e.target.value as ReminderRule["timing_type"] })}
                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-gray-50/50 transition-all"
                  >
                    {TIMING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* メッセージテンプレート */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">メッセージ</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {TEMPLATE_VARS.map(v => (
                    <button
                      key={v.var}
                      type="button"
                      onClick={() => setEditRule({ ...editRule, message_template: (editRule.message_template || "") + v.var })}
                      className="px-2.5 py-1 text-[11px] font-medium bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 transition-colors"
                    >
                      {v.var} <span className="text-sky-400">({v.desc})</span>
                    </button>
                  ))}
                </div>
                <textarea
                  value={editRule.message_template || ""}
                  onChange={e => setEditRule({ ...editRule, message_template: e.target.value })}
                  rows={8}
                  placeholder="リマインドメッセージを入力..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-gray-50/50 transition-all resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={closeModal} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editRule.name?.trim() || !editRule.message_template?.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-sky-600 hover:to-blue-700 disabled:opacity-40 text-sm font-medium shadow-lg shadow-sky-500/25 transition-all"
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
    </div>
  );
}
