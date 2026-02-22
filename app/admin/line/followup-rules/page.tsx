"use client";

import { useState, useEffect } from "react";

// --- 型定義 ---
interface FollowupLog {
  id: number;
  rule_id: number;
  patient_id: string;
  scheduled_at: string;
  sent_at: string | null;
  status: string;
  error_message: string | null;
}

interface FollowupRule {
  id: number;
  name: string;
  trigger_event: string;
  delay_days: number;
  message_template: string;
  flex_json: Record<string, unknown> | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  recent_logs: FollowupLog[];
}

// --- デフォルトテンプレート ---
const DEFAULT_TEMPLATES = [
  {
    name: "3日後 副作用確認",
    delay_days: 3,
    message_template:
      "{name}様\n施術から3日が経過しました。お体の調子はいかがでしょうか？\n気になる症状がございましたら、お気軽にご連絡ください。",
  },
  {
    name: "7日後 経過確認",
    delay_days: 7,
    message_template:
      "{name}様\n施術から1週間が経過しました。経過はいかがでしょうか？\n効果の実感や気になる点がございましたら、次回診察時にお伝えください。",
  },
  {
    name: "30日後 再処方案内",
    delay_days: 30,
    message_template:
      "{name}様\n前回の施術から約1ヶ月が経過しました。\nお薬の残量が少なくなっていませんか？\n再処方をご希望の方は、マイページから簡単にお申し込みいただけます。",
  },
];

// --- ステータス表示設定 ---
const LOG_STATUS_CONFIG: Record<string, { text: string; bg: string; textColor: string }> = {
  pending: { text: "待機中", bg: "bg-amber-50", textColor: "text-amber-700" },
  sent: { text: "送信済み", bg: "bg-emerald-50", textColor: "text-emerald-700" },
  failed: { text: "失敗", bg: "bg-red-50", textColor: "text-red-700" },
  skipped: { text: "スキップ", bg: "bg-gray-50", textColor: "text-gray-600" },
};

export default function FollowupRulesPage() {
  const [rules, setRules] = useState<FollowupRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<FollowupRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<number | null>(null);

  // フォーム
  const [formName, setFormName] = useState("");
  const [formDelayDays, setFormDelayDays] = useState<number>(3);
  const [formTemplate, setFormTemplate] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);

  const fetchRules = async () => {
    const res = await fetch("/api/admin/line/followup-rules", { credentials: "include" });
    const data = await res.json();
    if (data.rules) setRules(data.rules);
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const resetForm = () => {
    setShowModal(false);
    setEditingRule(null);
    setFormName("");
    setFormDelayDays(3);
    setFormTemplate("");
    setFormEnabled(true);
  };

  const handleEdit = (rule: FollowupRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDelayDays(rule.delay_days);
    setFormTemplate(rule.message_template);
    setFormEnabled(rule.is_enabled);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formTemplate.trim() || saving) return;
    setSaving(true);

    const body = {
      name: formName.trim(),
      trigger_event: "payment_completed",
      delay_days: formDelayDays,
      message_template: formTemplate,
      is_enabled: formEnabled,
    };

    const url = editingRule
      ? `/api/admin/line/followup-rules/${editingRule.id}`
      : "/api/admin/line/followup-rules";
    const method = editingRule ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await fetchRules();
      resetForm();
    } else {
      const data = await res.json();
      alert(data.error || "保存に失敗しました");
    }
    setSaving(false);
  };

  const handleToggle = async (rule: FollowupRule) => {
    const res = await fetch(`/api/admin/line/followup-rules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_enabled: !rule.is_enabled }),
    });
    if (res.ok) {
      await fetchRules();
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/admin/line/followup-rules/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      await fetchRules();
      setDeleteConfirm(null);
    }
  };

  const handleUseTemplate = (tpl: (typeof DEFAULT_TEMPLATES)[number]) => {
    setFormName(tpl.name);
    setFormDelayDays(tpl.delay_days);
    setFormTemplate(tpl.message_template);
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                自動フォローアップ
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                決済完了後に自動でフォローアップメッセージをLINE送信します
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-medium hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新しいルール
            </button>
          </div>

          {/* サマリー */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-3 border border-gray-100/50 text-center">
              <div className="text-xl font-bold text-gray-700">{rules.length}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">総ルール数</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-100/50 text-center">
              <div className="text-xl font-bold text-emerald-700">
                {rules.filter((r) => r.is_enabled).length}
              </div>
              <div className="text-[10px] text-emerald-500 mt-0.5">有効</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-3 border border-gray-100/50 text-center">
              <div className="text-xl font-bold text-gray-500">
                {rules.filter((r) => !r.is_enabled).length}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">無効</div>
            </div>
          </div>
        </div>
      </div>

      {/* ルール一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">フォローアップルールがありません</p>
            <p className="text-gray-300 text-xs mt-1">
              「新しいルール」ボタンから作成しましょう
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => {
              const sentCount = rule.recent_logs.filter((l) => l.status === "sent").length;
              const failedCount = rule.recent_logs.filter((l) => l.status === "failed").length;
              const pendingCount = rule.recent_logs.filter((l) => l.status === "pending").length;

              return (
                <div
                  key={rule.id}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200"
                >
                  <div className="p-5">
                    {/* 上段: 名前 + トグル + 操作 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900 text-[15px]">{rule.name}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-700">
                            {rule.delay_days}日後
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-gray-400">
                            作成: {formatDate(rule.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* 有効/無効トグル */}
                        <button
                          onClick={() => handleToggle(rule)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            rule.is_enabled ? "bg-[#06C755]" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              rule.is_enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>

                        {/* 編集 */}
                        <button
                          onClick={() => handleEdit(rule)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="編集"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* 削除 */}
                        <button
                          onClick={() => setDeleteConfirm(rule.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* メッセージプレビュー */}
                    <div className="bg-gray-50 rounded-lg px-3.5 py-2.5 mb-4">
                      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {rule.message_template}
                      </p>
                    </div>

                    {/* ログサマリー */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-gray-500">送信済み</span>
                          <span className="font-semibold text-gray-700">{sentCount}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-gray-500">待機中</span>
                          <span className="font-semibold text-gray-700">{pendingCount}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-gray-500">失敗</span>
                          <span className="font-semibold text-gray-700">{failedCount}</span>
                        </span>
                      </div>

                      {rule.recent_logs.length > 0 && (
                        <button
                          onClick={() => setExpandedLogs(expandedLogs === rule.id ? null : rule.id)}
                          className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                        >
                          {expandedLogs === rule.id ? "閉じる" : "送信ログ"}
                          <svg
                            className={`w-3.5 h-3.5 transition-transform ${expandedLogs === rule.id ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 送信ログ展開 */}
                  {expandedLogs === rule.id && rule.recent_logs.length > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50/50">
                      <div className="px-5 py-3">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          直近の送信ログ
                        </div>
                        <div className="space-y-1.5">
                          {rule.recent_logs.map((log) => {
                            const st = LOG_STATUS_CONFIG[log.status] || LOG_STATUS_CONFIG.pending;
                            return (
                              <div
                                key={log.id}
                                className="flex items-center justify-between py-1.5 px-3 bg-white rounded-lg border border-gray-100"
                              >
                                <div className="flex items-center gap-3 text-xs">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${st.bg} ${st.textColor}`}>
                                    {st.text}
                                  </span>
                                  <span className="text-gray-500">
                                    患者ID: {log.patient_id}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400">
                                  {log.sent_at
                                    ? `送信: ${formatDate(log.sent_at)}`
                                    : `予定: ${formatDate(log.scheduled_at)}`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ルール作成/編集モーダル */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => resetForm()}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">
                  {editingRule ? "ルール編集" : "フォローアップルール作成"}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
              {/* デフォルトテンプレート提案（新規作成時のみ） */}
              {!editingRule && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    テンプレートから選択
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {DEFAULT_TEMPLATES.map((tpl, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleUseTemplate(tpl)}
                        className="px-3 py-2.5 border border-gray-200 rounded-xl text-left hover:border-teal-300 hover:bg-teal-50/30 transition-all"
                      >
                        <div className="text-xs font-medium text-gray-700">{tpl.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                          {tpl.message_template.substring(0, 40)}...
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ルール名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  ルール名{" "}
                  <span className="text-red-500 text-xs px-1.5 py-0.5 bg-red-50 rounded">必須</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: 3日後 副作用確認"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-gray-50/50 transition-all"
                  autoFocus
                />
              </div>

              {/* 遅延日数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  送信タイミング（決済完了から）{" "}
                  <span className="text-red-500 text-xs px-1.5 py-0.5 bg-red-50 rounded">必須</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formDelayDays}
                    onChange={(e) => setFormDelayDays(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    className="w-24 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-gray-50/50 transition-all text-center"
                  />
                  <span className="text-sm text-gray-500">日後</span>
                </div>
              </div>

              {/* メッセージテンプレート */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  メッセージ{" "}
                  <span className="text-red-500 text-xs px-1.5 py-0.5 bg-red-50 rounded">必須</span>
                </label>
                <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-t-xl border-b-0">
                  <span className="text-[10px] text-gray-400 mr-2">変数:</span>
                  <button
                    onClick={() => setFormTemplate((prev) => prev + "{name}")}
                    className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                  >
                    {"{name}"}
                  </button>
                  <button
                    onClick={() => setFormTemplate((prev) => prev + "{patient_id}")}
                    className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                  >
                    {"{patient_id}"}
                  </button>
                  <button
                    onClick={() => setFormTemplate((prev) => prev + "{send_date}")}
                    className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                  >
                    {"{send_date}"}
                  </button>
                </div>
                <textarea
                  value={formTemplate}
                  onChange={(e) => setFormTemplate(e.target.value)}
                  placeholder="フォローアップメッセージを入力してください..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-b-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 resize-none transition-all"
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-gray-400">{formTemplate.length}文字</span>
                </div>
              </div>

              {/* メッセージプレビュー */}
              {formTemplate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    プレビュー
                  </label>
                  <div className="bg-[#7494C0] rounded-xl p-4">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[300px] shadow-sm">
                      <p className="text-sm whitespace-pre-wrap text-gray-800">
                        {formTemplate
                          .replace(/\{name\}/g, "田中 太郎")
                          .replace(/\{patient_id\}/g, "P-12345")
                          .replace(/\{send_date\}/g, "2026/2/22")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 有効/無効 */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-gray-700">有効にする</div>
                  <div className="text-xs text-gray-400">無効の場合、新しい決済に対してスケジュールされません</div>
                </div>
                <button
                  onClick={() => setFormEnabled(!formEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formEnabled ? "bg-[#06C755]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formTemplate.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl hover:from-[#05b34d] hover:to-[#049a42] disabled:opacity-40 text-sm font-medium shadow-lg shadow-green-500/25 transition-all"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    保存中...
                  </span>
                ) : (
                  "保存"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm !== null && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">ルールを削除</h3>
              <p className="text-sm text-gray-500 mb-5">
                このフォローアップルールを削除しますか？送信ログは保持されます。
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium shadow-lg shadow-red-500/25"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
