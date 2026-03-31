"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useConfirmModal } from "@/hooks/useConfirmModal";

interface PolicyRule {
  id: number;
  rule_name: string;
  rule_type: string;
  priority: number;
  conditions: Record<string, unknown>;
  action: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

interface PolicyLog {
  id: number;
  draft_id: number;
  patient_id: string;
  matched_rules: Array<{ rule_id: number; rule_name: string; rule_type: string }>;
  final_decision: string;
  created_at: string;
}

const RULE_TYPES = [
  { value: "medical_block", label: "医療質問ブロック" },
  { value: "approval_required", label: "承認必須" },
  { value: "escalate", label: "エスカレーション" },
  { value: "auto_allow", label: "自動返信許可" },
];

const DECISION_LABELS: Record<string, { label: string; color: string }> = {
  auto_reply_ok: { label: "自動返信OK", color: "bg-green-50 text-green-700" },
  approval_required: { label: "承認必須", color: "bg-yellow-50 text-yellow-700" },
  escalate_to_staff: { label: "エスカレーション", color: "bg-orange-50 text-orange-700" },
  block: { label: "ブロック", color: "bg-red-50 text-red-700" },
};

export default function AiReplyPolicyPage() {
  const apiKey = "/api/admin/line/ai-reply-policy";
  const { data, isLoading } = useSWR(apiKey);
  const rules: PolicyRule[] = data?.rules || [];
  const recentLogs: PolicyLog[] = data?.recentLogs || [];
  const { confirm, ConfirmDialog } = useConfirmModal();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    rule_name: "",
    rule_type: "escalate",
    priority: 100,
    category: "",
    key_topics: "",
    confidence_below: "",
    decision: "escalate_to_staff" as string,
    message: "",
  });

  const handleCreate = async () => {
    const conditions: Record<string, unknown> = {};
    if (form.category) conditions.category = form.category;
    if (form.key_topics) conditions.key_topics_contains = form.key_topics.split(",").map(s => s.trim());
    if (form.confidence_below) conditions.confidence_below = parseFloat(form.confidence_below);

    const res = await fetch(apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rule_name: form.rule_name,
        rule_type: form.rule_type,
        priority: form.priority,
        conditions,
        action: { decision: form.decision, message: form.message || undefined },
      }),
    });
    if (res.ok) {
      mutate(apiKey);
      setShowForm(false);
      setForm({ rule_name: "", rule_type: "escalate", priority: 100, category: "", key_topics: "", confidence_below: "", decision: "escalate_to_staff", message: "" });
    }
  };

  const handleToggle = async (rule: PolicyRule) => {
    await fetch(apiKey, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
    });
    mutate(apiKey);
  };

  const handleDelete = async (rule: PolicyRule) => {
    const ok = await confirm({ title: "ルール削除", message: `「${rule.rule_name}」を削除しますか？`, variant: "danger", confirmLabel: "削除" });
    if (!ok) return;
    await fetch(apiKey, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id }),
    });
    mutate(apiKey);
  };

  if (isLoading) return <div className="p-6 text-gray-500">読み込み中...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-800">AI返信 ポリシールール</h1>
        <p className="text-sm text-gray-500 mt-1">
          メッセージ分類結果に基づいて、自動返信・承認必須・エスカレーション・ブロックを制御するルールです。
        </p>
      </div>

      {/* ルール一覧 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">ルール一覧 ({rules.length}件)</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            + ルール追加
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg border p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">ルール名</label>
                <input value={form.rule_name} onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="例: 医療質問エスカレーション" />
              </div>
              <div>
                <label className="text-xs text-gray-500">タイプ</label>
                <select value={form.rule_type} onChange={e => setForm(f => ({ ...f, rule_type: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm">
                  {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">カテゴリ条件（空=全て）</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">すべて</option>
                  <option value="medical">medical</option>
                  <option value="operational">operational</option>
                  <option value="greeting">greeting</option>
                  <option value="other">other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">キートピック（カンマ区切り）</label>
                <input value={form.key_topics} onChange={e => setForm(f => ({ ...f, key_topics: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="例: 副作用,禁忌,妊娠" />
              </div>
              <div>
                <label className="text-xs text-gray-500">信頼度閾値以下</label>
                <input value={form.confidence_below} onChange={e => setForm(f => ({ ...f, confidence_below: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="例: 0.5" type="number" step="0.1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">優先度（小さい=高）</label>
                <input value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-sm" type="number" />
              </div>
              <div>
                <label className="text-xs text-gray-500">判定</label>
                <select value={form.decision} onChange={e => setForm(f => ({ ...f, decision: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm">
                  {Object.entries(DECISION_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">メッセージ（任意）</label>
                <input value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="例: 医療スタッフが対応します" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">キャンセル</button>
              <button onClick={handleCreate} disabled={!form.rule_name} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">追加</button>
            </div>
          </div>
        )}

        {rules.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">
            ポリシールールはまだ設定されていません。
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <div key={rule.id} className={`bg-white rounded-lg border p-3 ${!rule.is_active ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-8">#{rule.priority}</span>
                    <span className="font-medium text-sm text-gray-700">{rule.rule_name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${DECISION_LABELS[(rule.action as { decision?: string })?.decision || ""]?.color || "bg-gray-100 text-gray-500"}`}>
                      {DECISION_LABELS[(rule.action as { decision?: string })?.decision || ""]?.label || "不明"}
                    </span>
                    {!rule.is_active && <span className="text-xs text-gray-400">無効</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(rule)} className="text-xs text-blue-500 hover:text-blue-700">
                      {rule.is_active ? "無効化" : "有効化"}
                    </button>
                    <button onClick={() => handleDelete(rule)} className="text-xs text-red-400 hover:text-red-600">削除</button>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  条件: {JSON.stringify(rule.conditions)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ヒット履歴 */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">直近のポリシー判定ログ</h2>
        {recentLogs.length === 0 ? (
          <div className="bg-white rounded-lg border p-4 text-center text-gray-400 text-sm">
            まだログはありません。
          </div>
        ) : (
          <div className="bg-white rounded-lg border divide-y">
            {recentLogs.map(log => (
              <div key={log.id} className="p-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs">{new Date(log.created_at).toLocaleString("ja-JP")}</span>
                  <span className="text-gray-600">患者: {log.patient_id}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${DECISION_LABELS[log.final_decision]?.color || "bg-gray-100"}`}>
                    {DECISION_LABELS[log.final_decision]?.label || log.final_decision}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {log.matched_rules.map(r => r.rule_name).join(", ") || "マッチなし"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog />
    </div>
  );
}
