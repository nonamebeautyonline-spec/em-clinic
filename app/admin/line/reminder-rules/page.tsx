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

  // 新規作成
  const handleCreate = () => {
    setEditRule({
      name: "",
      timing_type: "before_hours",
      timing_value: 24,
      message_template: DEFAULT_TEMPLATE,
      is_enabled: true,
    });
    setShowModal(true);
  };

  // 編集
  const handleEdit = (rule: ReminderRule) => {
    setEditRule({ ...rule });
    setShowModal(true);
  };

  // 保存
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

  // 有効/無効トグル
  const handleToggle = async (rule: ReminderRule) => {
    await fetch("/api/admin/line/reminder-rules", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, name: rule.name, timing_type: rule.timing_type, timing_value: rule.timing_value, message_template: rule.message_template, is_enabled: !rule.is_enabled }),
    });
    loadData();
  };

  // 削除
  const handleDelete = async (id: number) => {
    if (!confirm("このリマインドルールを削除しますか？")) return;
    await fetch(`/api/admin/line/reminder-rules?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#06C755] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">予約リマインド</h1>
          <p className="text-sm text-gray-500 mt-1">
            予約のN時間前/N日前にLINEで自動通知。無断キャンセルを防止します。
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-[#06C755] text-white text-sm font-medium rounded-lg hover:bg-[#05b34c] transition-colors"
        >
          + 新しいルール
        </button>
      </div>

      {/* ルール一覧 */}
      {rules.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">&#9200;</div>
          <p className="text-sm">リマインドルールはまだありません</p>
          <p className="text-xs text-gray-300 mt-1">「新しいルール」から予約リマインドを設定できます</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white rounded-lg border border-gray-200 p-5 transition-shadow hover:shadow-sm ${
                !rule.is_enabled ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-bold text-gray-900 truncate">{rule.name}</h3>
                    {!rule.is_enabled && (
                      <span className="shrink-0 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-full">
                        停止中
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                      予約の {rule.timing_value}{rule.timing_type === "before_hours" ? "時間" : "日"}前
                    </span>
                    <span>送信実績: <span className="text-gray-600 font-medium">{rule.sent_count}件</span></span>
                  </div>

                  {/* メッセージプレビュー */}
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">
                    {rule.message_template}
                  </div>
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-3 ml-4">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      rule.is_enabled ? "bg-[#06C755]" : "bg-gray-300"
                    }`}
                    title={rule.is_enabled ? "停止する" : "有効にする"}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        rule.is_enabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 作成/編集モーダル */}
      {showModal && editRule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-700 mb-4">
              {editRule.id ? "ルール編集" : "新しいリマインドルール"}
            </h3>

            <div className="space-y-4">
              {/* ルール名 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">ルール名</label>
                <input
                  type="text"
                  value={editRule.name || ""}
                  onChange={(e) => setEditRule({ ...editRule, name: e.target.value })}
                  placeholder="例: 予約24時間前リマインド"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>

              {/* タイミング */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">送信タイミング</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">予約の</span>
                  <input
                    type="number"
                    min={1}
                    value={editRule.timing_value ?? 24}
                    onChange={(e) => setEditRule({ ...editRule, timing_value: parseInt(e.target.value) || 1 })}
                    className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  />
                  <select
                    value={editRule.timing_type || "before_hours"}
                    onChange={(e) => setEditRule({ ...editRule, timing_type: e.target.value as ReminderRule["timing_type"] })}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                  >
                    {TIMING_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* メッセージテンプレート */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">メッセージ</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {TEMPLATE_VARS.map((v) => (
                    <button
                      key={v.var}
                      type="button"
                      onClick={() => {
                        setEditRule({
                          ...editRule,
                          message_template: (editRule.message_template || "") + v.var,
                        });
                      }}
                      className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                    >
                      {v.var} ({v.desc})
                    </button>
                  ))}
                </div>
                <textarea
                  value={editRule.message_template || ""}
                  onChange={(e) => setEditRule({ ...editRule, message_template: e.target.value })}
                  rows={8}
                  placeholder="リマインドメッセージを入力..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowModal(false); setEditRule(null); }}
                className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editRule.name?.trim() || !editRule.message_template?.trim()}
                className="px-5 py-2 text-xs bg-[#06C755] text-white rounded-lg hover:bg-[#05b34c] disabled:opacity-50 transition-colors"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
