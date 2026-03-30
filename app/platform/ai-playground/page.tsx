"use client";

import { useState } from "react";
import useSWR from "swr";

// Playground実行結果の型
interface PlaygroundResult {
  ok: boolean;
  taskId: string | null;
  status: string;
  output: Record<string, unknown>;
  handoffSummary: Record<string, unknown>;
  trace: {
    filterResult?: Record<string, unknown>;
    classifyResult?: Record<string, unknown>;
    policyResult?: Record<string, unknown>;
    sourcesResult?: Record<string, unknown>;
    generateResult?: Record<string, unknown>;
    warnings?: string[];
    error?: string;
  };
  evidence: Array<Record<string, unknown>>;
  tokens: { input: number; output: number };
  elapsedMs: number;
}

// トレースステップ名の日本語ラベル
const TRACE_LABELS: Record<string, string> = {
  filterResult: "Filter（フィルタ）",
  classifyResult: "Classify（分類）",
  policyResult: "Policy（ポリシー）",
  sourcesResult: "Sources（ソース取得）",
  generateResult: "Generate（生成）",
};

export default function AIPlaygroundPage() {
  const [workflowType, setWorkflowType] = useState("");
  const [inputJson, setInputJson] = useState('{\n  "text": "診察の予約をしたいです"\n}');
  const [tenantId, setTenantId] = useState("");
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());

  // 利用可能なworkflow一覧を取得
  const { data: workflowsData } = useSWR<{
    ok: boolean;
    workflows: Array<{ id: string; label: string; description: string }>;
  }>("/api/platform/ai-playground");

  const workflows = workflowsData?.workflows || [];

  // 実行
  const handleExecute = async () => {
    setError("");
    setResult(null);

    if (!workflowType) {
      setError("Workflowを選択してください");
      return;
    }

    let parsedInput;
    try {
      parsedInput = JSON.parse(inputJson);
    } catch {
      setError("入力JSONの形式が不正です");
      return;
    }

    setRunning(true);
    try {
      const res = await fetch("/api/platform/ai-playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workflow_type: workflowType,
          input: parsedInput,
          tenant_id: tenantId || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "実行に失敗しました");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("通信エラーが発生しました");
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  // トレースアコーディオン制御
  const toggleTrace = (key: string) => {
    setExpandedTraces((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">AI Playground</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Workflowパイプラインをテスト実行し、各ステップの結果を確認できます。
      </p>

      {/* 入力セクション */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Workflow選択 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Workflow</label>
            <select
              value={workflowType}
              onChange={(e) => setWorkflowType(e.target.value)}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">選択してください</option>
              {workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label} ({w.id})
                </option>
              ))}
            </select>
          </div>

          {/* テナントID（任意） */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              テナントID <span className="text-zinc-400">（任意）</span>
            </label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="UUID"
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>

        {/* JSON入力 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">入力 (JSON)</label>
          <textarea
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            rows={6}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}

        <button
          onClick={handleExecute}
          disabled={running}
          className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {running ? "実行中..." : "実行"}
        </button>
      </div>

      {/* 結果セクション */}
      {result && (
        <div className="space-y-4">
          {/* ステータスバー */}
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex items-center gap-4 flex-wrap">
            <StatusBadge status={result.status} />
            <span className="text-sm text-zinc-500">
              Task ID: <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">{result.taskId || "N/A"}</code>
            </span>
            <span className="text-sm text-zinc-500">{result.elapsedMs}ms</span>
            <span className="text-sm text-zinc-500">
              Tokens: {result.tokens.input} in / {result.tokens.output} out
            </span>
          </div>

          {/* Output */}
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
            <h2 className="text-lg font-semibold text-zinc-800 mb-3">Output</h2>
            <pre className="bg-zinc-50 p-4 rounded-lg text-sm font-mono overflow-auto max-h-80 text-zinc-700">
              {JSON.stringify(result.output, null, 2)}
            </pre>
          </div>

          {/* Handoff Summary */}
          {result.handoffSummary && (
            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
              <h2 className="text-lg font-semibold text-zinc-800 mb-3">Handoff Summary</h2>
              <pre className="bg-zinc-50 p-4 rounded-lg text-sm font-mono overflow-auto max-h-60 text-zinc-700">
                {JSON.stringify(result.handoffSummary, null, 2)}
              </pre>
            </div>
          )}

          {/* Trace（アコーディオン） */}
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
            <h2 className="text-lg font-semibold text-zinc-800 mb-3">Trace</h2>
            <div className="space-y-2">
              {Object.entries(TRACE_LABELS).map(([key, label]) => {
                const data = result.trace[key as keyof typeof result.trace];
                if (!data) return null;
                const isExpanded = expandedTraces.has(key);
                return (
                  <div key={key} className="border border-zinc-200 rounded-lg">
                    <button
                      onClick={() => toggleTrace(key)}
                      className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      <span>{label}</span>
                      <span className="text-zinc-400">{isExpanded ? "▼" : "▶"}</span>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <pre className="bg-zinc-50 p-3 rounded text-xs font-mono overflow-auto max-h-60 text-zinc-600">
                          {JSON.stringify(data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Warnings */}
              {result.trace.warnings && result.trace.warnings.length > 0 && (
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">Warnings</h3>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {result.trace.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error */}
              {result.trace.error && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-800 mb-2">Error</h3>
                  <p className="text-sm text-red-700">{result.trace.error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Evidence */}
          {result.evidence && result.evidence.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
              <h2 className="text-lg font-semibold text-zinc-800 mb-3">Evidence ({result.evidence.length}件)</h2>
              <div className="space-y-2">
                {result.evidence.map((ev, i) => (
                  <div key={i} className="border border-zinc-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-zinc-100 px-2 py-0.5 rounded font-medium">{String(ev.type)}</span>
                      <span className="text-xs text-zinc-500">{String(ev.source)}</span>
                      {ev.relevance != null && (
                        <span className="text-xs text-amber-600">関連度: {String(ev.relevance)}</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-700">{String(ev.content)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** ステータスバッジ */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    skipped: "bg-zinc-100 text-zinc-600",
    escalated: "bg-yellow-100 text-yellow-800",
    pending: "bg-blue-100 text-blue-800",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-zinc-100 text-zinc-600"}`}>
      {status}
    </span>
  );
}
