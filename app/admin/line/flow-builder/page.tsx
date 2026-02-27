"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FlowEditor, { NodeSettingsPanel } from "./flow-editor";
import {
  type FlowGraph,
  type FlowNode,
  type StepItemData,
  stepsToFlowGraph,
  flowGraphToSteps,
} from "./flow-converter";

/* ---------- 型定義 ---------- */

interface Scenario {
  id: number;
  name: string;
  trigger_type: string;
  is_enabled: boolean;
}

/* ---------- メインページ ---------- */

export default function FlowBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioIdParam = searchParams.get("scenario_id");

  // シナリオ一覧
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(
    scenarioIdParam ? parseInt(scenarioIdParam) : null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // フローグラフ
  const [graph, setGraph] = useState<FlowGraph>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  // JSON表示モーダル
  const [showJson, setShowJson] = useState(false);

  // シナリオ名（表示用）
  const scenarioName = scenarios.find(s => s.id === selectedScenarioId)?.name || "";

  /* ---------- シナリオ一覧の取得 ---------- */

  const loadScenarios = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/line/step-scenarios", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setScenarios(d.scenarios || []);
      }
    } catch (e) {
      console.error("シナリオ一覧取得エラー:", e);
    }
  }, []);

  /* ---------- フローデータの取得 ---------- */

  const loadFlow = useCallback(async (scenarioId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/line/flow-builder?scenario_id=${scenarioId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const d = await res.json();
        setGraph(d.graph || { nodes: [], edges: [] });
      } else {
        console.error("フローデータ取得失敗");
        setGraph({ nodes: [], edges: [] });
      }
    } catch (e) {
      console.error("フローデータ取得エラー:", e);
      setGraph({ nodes: [], edges: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------- 保存 ---------- */

  const handleSave = useCallback(async () => {
    if (!selectedScenarioId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/line/flow-builder", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: selectedScenarioId,
          graph,
        }),
      });
      if (res.ok) {
        alert("フローを保存しました");
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "保存に失敗しました");
      }
    } catch (e) {
      console.error("保存エラー:", e);
      alert("保存中にエラーが発生しました");
    } finally {
      setSaving(false);
    }
  }, [selectedScenarioId, graph]);

  /* ---------- 初期読み込み ---------- */

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  useEffect(() => {
    if (selectedScenarioId) {
      loadFlow(selectedScenarioId);
    }
  }, [selectedScenarioId, loadFlow]);

  /* ---------- シナリオ選択ハンドラ ---------- */

  const handleSelectScenario = (id: number) => {
    setSelectedScenarioId(id);
    setSelectedNode(null);
    // URLパラメータを更新
    router.replace(`/admin/line/flow-builder?scenario_id=${id}`);
  };

  /* ---------- ノード選択ハンドラ ---------- */

  const handleSelectNode = (node: FlowNode | null) => {
    setSelectedNode(node);
  };

  /* ---------- ノードデータ更新ハンドラ ---------- */

  const handleUpdateNodeData = (patch: Partial<StepItemData>) => {
    if (!selectedNode) return;
    const updatedNodes = graph.nodes.map(n =>
      n.id === selectedNode.id
        ? {
            ...n,
            data: { ...n.data, ...patch },
            // ラベルも更新
            label: buildUpdatedLabel(n, patch),
          }
        : n
    );
    const updatedGraph = { ...graph, nodes: updatedNodes };
    setGraph(updatedGraph);
    // 選択ノードも更新
    const updated = updatedNodes.find(n => n.id === selectedNode.id);
    if (updated) setSelectedNode(updated);
  };

  /* ---------- JSON変換表示 ---------- */

  const getStepsJson = () => {
    const steps = flowGraphToSteps(graph);
    return JSON.stringify(steps, null, 2);
  };

  /* ---------- レンダリング ---------- */

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/line/step-scenarios")}
            className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
          >
            &larr; ステップ配信
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <h1 className="text-base font-bold text-gray-900">フロービルダー</h1>
          </div>
          {scenarioName && (
            <>
              <div className="w-px h-5 bg-gray-200" />
              <span className="text-sm text-gray-500">{scenarioName}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* シナリオ選択 */}
          <select
            value={selectedScenarioId || ""}
            onChange={(e) => e.target.value && handleSelectScenario(parseInt(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
          >
            <option value="">シナリオを選択...</option>
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_enabled ? "" : "(停止中)"}
              </option>
            ))}
          </select>

          {/* JSON表示 */}
          <button
            onClick={() => setShowJson(true)}
            disabled={!selectedScenarioId}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40"
          >
            JSON
          </button>

          {/* シナリオ編集画面へ */}
          {selectedScenarioId && (
            <button
              onClick={() => router.push(`/admin/line/step-scenarios/${selectedScenarioId}`)}
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              シナリオ編集
            </button>
          )}

          {/* 保存 */}
          <button
            onClick={handleSave}
            disabled={saving || !selectedScenarioId}
            className="px-5 py-1.5 text-sm font-medium text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg transition-colors disabled:opacity-40 shadow-sm"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex min-h-0">
        {!selectedScenarioId ? (
          /* シナリオ未選択時 */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">シナリオを選択してフローを編集</p>
              <p className="text-gray-300 text-xs mt-1">右上のドロップダウンからシナリオを選んでください</p>
            </div>
          </div>
        ) : loading ? (
          /* 読み込み中 */
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">フローを読み込み中...</span>
            </div>
          </div>
        ) : (
          /* フローエディタ */
          <>
            <div className="flex-1 min-w-0">
              <FlowEditor
                graph={graph}
                onChange={setGraph}
                onSelectNode={handleSelectNode}
                selectedNodeId={selectedNode?.id || null}
              />
            </div>

            {/* 右サイドパネル（ノード選択時） */}
            {selectedNode && (
              <NodeSettingsPanel
                node={selectedNode}
                allNodes={graph.nodes}
                onUpdate={handleUpdateNodeData}
                onClose={() => setSelectedNode(null)}
              />
            )}
          </>
        )}
      </div>

      {/* JSONモーダル */}
      {showJson && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700">step_items JSON</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getStepsJson());
                    alert("コピーしました");
                  }}
                  className="px-3 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  コピー
                </button>
                <button
                  onClick={() => setShowJson(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <pre className="text-xs font-mono text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
                {getStepsJson()}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- ヘルパー ---------- */

/** ノードデータ更新時にラベルも更新する */
function buildUpdatedLabel(node: FlowNode, patch: Partial<StepItemData>): string {
  const data = { ...node.data, ...patch };
  const stepType = data.step_type;

  const typeLabels: Record<string, string> = {
    send_text: "テキスト送信",
    send_template: "テンプレート送信",
    condition: "条件分岐",
    tag_add: "タグ追加",
    tag_remove: "タグ除去",
    mark_change: "マーク変更",
    menu_change: "メニュー変更",
    wait: "待機",
  };

  const base = typeLabels[stepType] || stepType;

  switch (stepType) {
    case "send_text":
      return data.content
        ? `${base}\n${(data.content as string).substring(0, 30)}${(data.content as string).length > 30 ? "..." : ""}`
        : base;
    case "send_template":
      return data.template_id ? `${base}\nID: ${data.template_id}` : base;
    case "condition":
      return data.condition_rules?.length > 0
        ? `${base}\n${data.condition_rules.length}件の条件`
        : base;
    case "tag_add":
    case "tag_remove":
      return data.tag_id ? `${base}\nタグID: ${data.tag_id}` : base;
    case "menu_change":
      return data.menu_id ? `${base}\nメニューID: ${data.menu_id}` : base;
    default:
      return base;
  }
}
