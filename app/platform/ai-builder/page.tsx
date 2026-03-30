"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";

// ============================================================
// 型定義
// ============================================================

interface PolicyRule {
  id: number;
  workflow_type: string;
  rule_name: string;
  rule_type: string;
  priority: number;
  conditions: Record<string, unknown>;
  action: Record<string, unknown>;
  is_active: boolean;
  tenant_id: string | null;
  created_at: string;
}

interface TuningSuggestion {
  id: number;
  tenant_id: string | null;
  suggestion_type: string;
  current_config: Record<string, unknown>;
  suggested_config: Record<string, unknown>;
  expected_improvement: Record<string, unknown>;
  evidence: Array<Record<string, unknown>>;
  status: string;
  created_at: string;
}

// ソースタイプ定義
const SOURCE_TYPES = [
  { key: "faq", label: "FAQ" },
  { key: "rule", label: "ルール" },
  { key: "approved_reply", label: "承認済み返信" },
  { key: "memory", label: "患者メモリ" },
  { key: "state", label: "状態" },
  { key: "live_data", label: "リアルタイムデータ" },
] as const;

// 提案タイプの日本語ラベル
const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  confidence_threshold: "信頼度閾値調整",
  model_routing: "モデルルーティング最適化",
  prompt_improvement: "プロンプト改善",
  tone_adjustment: "トーン調整",
};

// タブ定義
const TABS = [
  { key: "policy", label: "ポリシーエディタ" },
  { key: "weights", label: "ソース重み" },
  { key: "tuning", label: "最適化提案" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AIBuilderPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("policy");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-800 mb-2">AI Builder</h1>
      <p className="text-sm text-zinc-500 mb-6">
        ポリシールール、ソース重み、自動最適化を管理します。
      </p>

      {/* タブ */}
      <div className="flex border-b border-zinc-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-amber-500 text-amber-700"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "policy" && <PolicyEditorTab />}
      {activeTab === "weights" && <SourceWeightsTab />}
      {activeTab === "tuning" && <TuningSuggestionsTab />}
    </div>
  );
}

// ============================================================
// ポリシーエディタタブ
// ============================================================

function PolicyEditorTab() {
  const { data, mutate } = useSWR<{ ok: boolean; rules: PolicyRule[] }>(
    "/api/platform/ai-policy-rules",
  );
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PolicyRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const rules = useMemo(() => data?.rules || [], [data]);

  // フォーム状態
  const [form, setForm] = useState({
    workflow_type: "line-reply",
    rule_name: "",
    rule_type: "keyword",
    priority: 100,
    conditions: "{}",
    action: '{"decision": "auto_reply_ok"}',
    is_active: true,
  });

  const resetForm = useCallback(() => {
    setForm({
      workflow_type: "line-reply",
      rule_name: "",
      rule_type: "keyword",
      priority: 100,
      conditions: "{}",
      action: '{"decision": "auto_reply_ok"}',
      is_active: true,
    });
    setEditingRule(null);
    setShowForm(false);
    setError("");
  }, []);

  const handleEdit = useCallback((rule: PolicyRule) => {
    setForm({
      workflow_type: rule.workflow_type,
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      priority: rule.priority,
      conditions: JSON.stringify(rule.conditions, null, 2),
      action: JSON.stringify(rule.action, null, 2),
      is_active: rule.is_active,
    });
    setEditingRule(rule);
    setShowForm(true);
  }, []);

  const handleSave = async () => {
    setError("");
    let conditionsParsed, actionParsed;
    try {
      conditionsParsed = JSON.parse(form.conditions);
    } catch {
      setError("Conditions JSONの形式が不正です");
      return;
    }
    try {
      actionParsed = JSON.parse(form.action);
    } catch {
      setError("Action JSONの形式が不正です");
      return;
    }

    setSaving(true);
    try {
      const url = editingRule
        ? `/api/platform/ai-policy-rules/${editingRule.id}`
        : "/api/platform/ai-policy-rules";
      const method = editingRule ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workflow_type: form.workflow_type,
          rule_name: form.rule_name,
          rule_type: form.rule_type,
          priority: form.priority,
          conditions: conditionsParsed,
          action: actionParsed,
          is_active: form.is_active,
        }),
      });

      const result = await res.json();
      if (!result.ok) {
        setError(result.message || "保存に失敗しました");
        return;
      }

      resetForm();
      mutate();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  // 有効/無効トグル
  const handleToggle = async (rule: PolicyRule) => {
    try {
      await fetch(`/api/platform/ai-policy-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !rule.is_active }),
      });
      mutate();
    } catch {
      // エラーは無視
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-800">ポリシールール</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium"
        >
          ルール追加
        </button>
      </div>

      {/* フォーム */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-zinc-700 mb-4">
            {editingRule ? "ルール編集" : "新規ルール"}
          </h3>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Workflow Type</label>
              <input
                value={form.workflow_type}
                onChange={(e) => setForm({ ...form, workflow_type: e.target.value })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">ルール名</label>
              <input
                value={form.rule_name}
                onChange={(e) => setForm({ ...form, rule_name: e.target.value })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">ルールタイプ</label>
              <select
                value={form.rule_type}
                onChange={(e) => setForm({ ...form, rule_type: e.target.value })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="keyword">keyword</option>
                <option value="category">category</option>
                <option value="confidence">confidence</option>
                <option value="escalation">escalation</option>
                <option value="custom">custom</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">優先度</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded"
                />
                有効
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Conditions (JSON)</label>
              <textarea
                value={form.conditions}
                onChange={(e) => setForm({ ...form, conditions: e.target.value })}
                rows={4}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Action (JSON)</label>
              <textarea
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                rows={4}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white rounded-lg text-sm font-medium"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg text-sm font-medium"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ルール一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="text-left px-4 py-3 font-medium text-zinc-600">ルール名</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">タイプ</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600">Workflow</th>
              <th className="text-center px-4 py-3 font-medium text-zinc-600">優先度</th>
              <th className="text-center px-4 py-3 font-medium text-zinc-600">状態</th>
              <th className="text-right px-4 py-3 font-medium text-zinc-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  ルールがありません
                </td>
              </tr>
            )}
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-800">{rule.rule_name}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-zinc-100 rounded text-xs">{rule.rule_type}</span>
                </td>
                <td className="px-4 py-3 text-zinc-600">{rule.workflow_type}</td>
                <td className="px-4 py-3 text-center text-zinc-600">{rule.priority}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      rule.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {rule.is_active ? "有効" : "無効"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="text-amber-600 hover:text-amber-800 text-xs font-medium"
                  >
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// ソース重みタブ
// ============================================================

function SourceWeightsTab() {
  const [tenantId, setTenantId] = useState("");
  const [workflowType, setWorkflowType] = useState("line-reply");
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // 重み読み込み
  const loadWeights = async () => {
    if (!tenantId) return;
    setMessage("");
    try {
      const res = await fetch(
        `/api/platform/ai-auto-tuning?type=weights&tenant_id=${tenantId}&workflow_type=${workflowType}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (data.ok) {
        setWeights(data.weights);
        setLoaded(true);
      }
    } catch {
      setMessage("読み込みに失敗しました");
    }
  };

  // 個別保存
  const handleSave = async (sourceType: string, weight: number) => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/platform/ai-auto-tuning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "set_weight",
          tenant_id: tenantId,
          workflow_type: workflowType,
          source_type: sourceType,
          weight,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("保存しました");
        setTimeout(() => setMessage(""), 2000);
      } else {
        setMessage(data.message || "保存に失敗しました");
      }
    } catch {
      setMessage("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-800 mb-4">ソース重み設定</h2>

      {/* テナント・Workflow選択 */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">テナントID</label>
            <input
              value={tenantId}
              onChange={(e) => { setTenantId(e.target.value); setLoaded(false); }}
              placeholder="UUID"
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Workflow Type</label>
            <input
              value={workflowType}
              onChange={(e) => { setWorkflowType(e.target.value); setLoaded(false); }}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadWeights}
              disabled={!tenantId}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white rounded-lg text-sm font-medium"
            >
              読み込み
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes("失敗") || message.includes("エラー") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {message}
        </div>
      )}

      {/* スライダー一覧 */}
      {loaded && (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <div className="space-y-6">
            {SOURCE_TYPES.map(({ key, label }) => {
              const currentWeight = weights[key] ?? 1.0;
              return (
                <div key={key} className="flex items-center gap-4">
                  <div className="w-36 text-sm font-medium text-zinc-700">{label}</div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={currentWeight}
                    onChange={(e) => setWeights({ ...weights, [key]: parseFloat(e.target.value) })}
                    className="flex-1 accent-amber-500"
                  />
                  <div className="w-12 text-sm text-zinc-600 text-right">{currentWeight.toFixed(1)}</div>
                  <button
                    onClick={() => handleSave(key, currentWeight)}
                    disabled={saving}
                    className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-xs font-medium"
                  >
                    保存
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 最適化提案タブ
// ============================================================

function TuningSuggestionsTab() {
  const [analyzeTenantId, setAnalyzeTenantId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const swrKey = `/api/platform/ai-auto-tuning?type=suggestions${statusFilter ? `&status=${statusFilter}` : ""}`;
  const { data, mutate } = useSWR<{ ok: boolean; suggestions: TuningSuggestion[] }>(swrKey);

  const suggestions = useMemo(() => data?.suggestions || [], [data]);

  // 分析実行
  const handleAnalyze = async () => {
    if (!analyzeTenantId) return;
    setAnalyzing(true);
    try {
      await fetch("/api/platform/ai-auto-tuning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "analyze", tenant_id: analyzeTenantId }),
      });
      mutate();
    } catch {
      // エラーは無視
    } finally {
      setAnalyzing(false);
    }
  };

  // 適用/却下
  const handleAction = async (id: number, action: "apply" | "reject") => {
    setActionLoading(id);
    try {
      await fetch("/api/platform/ai-auto-tuning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, suggestion_id: id }),
      });
      mutate();
    } catch {
      // エラーは無視
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-800 mb-4">最適化提案</h2>

      {/* 分析実行 */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">パフォーマンス分析</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-zinc-600 mb-1">テナントID</label>
            <input
              value={analyzeTenantId}
              onChange={(e) => setAnalyzeTenantId(e.target.value)}
              placeholder="UUID"
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !analyzeTenantId}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white rounded-lg text-sm font-medium whitespace-nowrap"
          >
            {analyzing ? "分析中..." : "分析実行"}
          </button>
        </div>
      </div>

      {/* フィルタ */}
      <div className="flex gap-2 mb-4">
        {["", "pending", "applied", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-amber-100 text-amber-700"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {s === "" ? "全て" : s}
          </button>
        ))}
      </div>

      {/* 提案一覧 */}
      <div className="space-y-4">
        {suggestions.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8 text-center text-zinc-400">
            提案がありません
          </div>
        )}

        {suggestions.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-zinc-800">
                  {SUGGESTION_TYPE_LABELS[s.suggestion_type] || s.suggestion_type}
                </h3>
                <SuggestionStatusBadge status={s.status} />
              </div>
              <span className="text-xs text-zinc-400">
                {new Date(s.created_at).toLocaleString("ja-JP")}
              </span>
            </div>

            {/* Diff表示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-1">現在の設定</div>
                <pre className="bg-red-50 p-3 rounded text-xs font-mono overflow-auto max-h-40 text-zinc-700">
                  {JSON.stringify(s.current_config, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-1">提案設定</div>
                <pre className="bg-green-50 p-3 rounded text-xs font-mono overflow-auto max-h-40 text-zinc-700">
                  {JSON.stringify(s.suggested_config, null, 2)}
                </pre>
              </div>
            </div>

            {/* 改善効果 */}
            {Object.keys(s.expected_improvement).length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-medium text-zinc-500 mb-1">予想改善効果</div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(s.expected_improvement).map(([k, v]) => (
                    <span key={k} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* アクションボタン */}
            {s.status === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(s.id, "apply")}
                  disabled={actionLoading === s.id}
                  className="px-4 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-zinc-300 text-white rounded-lg text-xs font-medium"
                >
                  適用
                </button>
                <button
                  onClick={() => handleAction(s.id, "reject")}
                  disabled={actionLoading === s.id}
                  className="px-4 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg text-xs font-medium"
                >
                  却下
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 提案ステータスバッジ */
function SuggestionStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    applied: "bg-green-100 text-green-700",
    rejected: "bg-zinc-100 text-zinc-500",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-zinc-100 text-zinc-600"}`}>
      {status}
    </span>
  );
}
