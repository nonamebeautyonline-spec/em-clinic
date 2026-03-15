"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  type FlowNode,
  type FlowEdge,
  type FlowGraph,
  type FlowNodeType,
  type StepItemData,
  type DisplayConditionsData,
  createNewNode,
  getNodeColor,
} from "./flow-converter";
import { nodeTypes } from "./_components/nodes/CustomNodes";

/* ---------- 型定義 ---------- */

interface FlowEditorProps {
  graph: FlowGraph;
  onChange: (graph: FlowGraph) => void;
  onSelectNode: (node: FlowNode | null) => void;
  selectedNodeId: string | null;
}

/* ---------- FlowGraph ↔ ReactFlow 変換 ---------- */

/** FlowNode → ReactFlow Node */
function toRFNode(node: FlowNode, isSelected: boolean): Node {
  return {
    id: node.id,
    type: node.type,
    position: { x: node.x, y: node.y },
    data: {
      flowType: node.type,
      label: node.label,
      stepData: node.data,
      isSelected,
    },
    selected: isSelected,
  };
}

/** ReactFlow Node → FlowNode */
function fromRFNode(rfNode: Node, originalNode: FlowNode): FlowNode {
  return {
    ...originalNode,
    x: rfNode.position.x,
    y: rfNode.position.y,
  };
}

/** FlowEdge → ReactFlow Edge */
function toRFEdge(edge: FlowEdge): Edge {
  const isTrue = edge.fromPort === "true";
  const isFalse = edge.fromPort === "false";
  const color = edge.color || (isTrue ? "#22c55e" : isFalse ? "#ef4444" : "#9ca3af");

  return {
    id: edge.id,
    source: edge.from,
    target: edge.to,
    sourceHandle: edge.fromPort === "bottom" ? undefined : edge.fromPort,
    targetHandle: undefined,
    label: edge.label,
    style: { stroke: color, strokeWidth: 2 },
    labelStyle: { fill: color, fontWeight: 600, fontSize: 10 },
    markerEnd: { type: MarkerType.ArrowClosed, color },
    type: "smoothstep",
  };
}

/** ReactFlow Edge → FlowEdge */
function fromRFEdge(rfEdge: Edge): FlowEdge {
  const fromPort = (rfEdge.sourceHandle as "bottom" | "true" | "false") || "bottom";
  const isTrue = fromPort === "true";
  const isFalse = fromPort === "false";

  return {
    id: rfEdge.id,
    from: rfEdge.source,
    to: rfEdge.target,
    fromPort,
    toPort: "top",
    label: isTrue ? "True" : isFalse ? "False" : undefined,
    color: isTrue ? "#22c55e" : isFalse ? "#ef4444" : undefined,
  };
}

/* ---------- ツールバー定義 ---------- */

const TOOLBAR_ITEMS: { type: FlowNodeType; label: string; icon: string; color: string }[] = [
  { type: "send", label: "送信", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", color: "#3b82f6" },
  { type: "condition", label: "条件分岐", icon: "M8 9l4-4 4 4m0 6l-4 4-4-4", color: "#eab308" },
  { type: "wait", label: "待機", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "#6b7280" },
  { type: "tag", label: "タグ操作", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z", color: "#22c55e" },
  { type: "menu", label: "メニュー", icon: "M4 6h16M4 10h16M4 14h16M4 18h16", color: "#8b5cf6" },
  { type: "ab_test", label: "A/B", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", color: "#f59e0b" },
  { type: "webhook", label: "Webhook", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", color: "#ef4444" },
  { type: "delay_until", label: "日時待機", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "#14b8a6" },
  { type: "random", label: "ランダム", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", color: "#d946ef" },
  { type: "goal", label: "ゴール", icon: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm0 0h18", color: "#10b981" },
  { type: "note", label: "メモ", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", color: "#fbbf24" },
];

/* ---------- メインコンポーネント ---------- */

export default function FlowEditor({ graph, onChange, onSelectNode, selectedNodeId }: FlowEditorProps) {
  /** FlowGraph → ReactFlow のノード・エッジに変換 */
  const rfNodes = useMemo<Node[]>(
    () => graph.nodes.map(n => toRFNode(n, n.id === selectedNodeId)),
    [graph.nodes, selectedNodeId]
  );
  const rfEdges = useMemo<Edge[]>(
    () => graph.edges.map(toRFEdge),
    [graph.edges]
  );

  /* ---------- ノード変更（移動・削除） ---------- */
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // ReactFlow のノード変更を反映
      const updatedRFNodes = applyNodeChanges(changes, rfNodes);

      // 削除されたノードのIDを収集
      const removedIds = new Set(
        changes.filter(c => c.type === "remove").map(c => c.id)
      );

      let newNodes: FlowNode[];
      let newEdges: FlowEdge[];

      if (removedIds.size > 0) {
        newNodes = graph.nodes.filter(n => !removedIds.has(n.id));
        newEdges = graph.edges.filter(e => !removedIds.has(e.from) && !removedIds.has(e.to));
        onSelectNode(null);
      } else {
        // 位置更新のみ
        newNodes = graph.nodes.map(n => {
          const rfNode = updatedRFNodes.find(rn => rn.id === n.id);
          if (!rfNode) return n;
          return { ...n, x: rfNode.position.x, y: rfNode.position.y };
        });
        newEdges = graph.edges;
      }

      onChange({ nodes: newNodes, edges: newEdges });
    },
    [rfNodes, graph, onChange, onSelectNode]
  );

  /* ---------- エッジ変更（削除） ---------- */
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const removedIds = new Set(
        changes.filter(c => c.type === "remove").map(c => c.id)
      );
      if (removedIds.size > 0) {
        onChange({ ...graph, edges: graph.edges.filter(e => !removedIds.has(e.id)) });
      }
    },
    [graph, onChange]
  );

  /* ---------- エッジ接続 ---------- */
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const fromPort = (connection.sourceHandle as "bottom" | "true" | "false") || "bottom";
      const isTrue = fromPort === "true";
      const isFalse = fromPort === "false";
      const edgeId = `edge-${connection.source}-${fromPort}-${connection.target}`;

      // 重複チェック
      if (graph.edges.some(e => e.id === edgeId)) return;

      const newEdge: FlowEdge = {
        id: edgeId,
        from: connection.source!,
        to: connection.target!,
        fromPort,
        toPort: "top",
        label: isTrue ? "True" : isFalse ? "False" : undefined,
        color: isTrue ? "#22c55e" : isFalse ? "#ef4444" : undefined,
      };

      onChange({ ...graph, edges: [...graph.edges, newEdge] });
    },
    [graph, onChange]
  );

  /* ---------- ノードクリック ---------- */
  const onNodeClick = useCallback(
    (_: React.MouseEvent, rfNode: Node) => {
      const flowNode = graph.nodes.find(n => n.id === rfNode.id);
      onSelectNode(flowNode || null);
    },
    [graph.nodes, onSelectNode]
  );

  /* ---------- 背景クリック → 選択解除 ---------- */
  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  /* ---------- ノード追加 ---------- */
  const handleAddNode = useCallback(
    (type: FlowNodeType) => {
      const newNode = createNewNode(type, 250, 250);
      onChange({ ...graph, nodes: [...graph.nodes, newNode] });
      onSelectNode(newNode);
    },
    [graph, onChange, onSelectNode]
  );

  /* ---------- MiniMap のノード色 ---------- */
  const miniMapNodeColor = useCallback((node: Node) => {
    const ft = (node.data as { flowType?: string })?.flowType || "send";
    const colors = getNodeColor(ft as FlowNodeType);
    return colors.headerBg;
  }, []);

  /* ---------- レンダリング ---------- */
  return (
    <div className="flex flex-col h-full">
      {/* ツールバー */}
      <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0 flex-wrap">
        <span className="text-xs text-gray-400 mr-1">ノード追加:</span>
        {TOOLBAR_ITEMS.map(item => (
          <button
            key={item.type}
            onClick={() => handleAddNode(item.type)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
            style={{ color: item.color }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {item.label}
          </button>
        ))}
      </div>

      {/* ReactFlowキャンバス */}
      <div className="flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultEdgeOptions={{
            type: "smoothstep",
            style: { strokeWidth: 2 },
          }}
          deleteKeyCode={["Backspace", "Delete"]}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
          <Controls
            showZoom
            showFitView
            showInteractive={false}
            position="bottom-right"
          />
          <MiniMap
            nodeColor={miniMapNodeColor}
            nodeStrokeWidth={2}
            pannable
            zoomable
            position="bottom-left"
            style={{ width: 160, height: 100, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

/* ---------- 設定パネルコンポーネント ---------- */

interface NodeSettingsPanelProps {
  node: FlowNode;
  allNodes: FlowNode[];
  onUpdate: (data: Partial<StepItemData>) => void;
  onClose: () => void;
}

export function NodeSettingsPanel({ node, allNodes, onUpdate, onClose }: NodeSettingsPanelProps) {
  const data = node.data;
  const colors = getNodeColor(node.type);

  /** ステップタイプのラベル */
  const stepTypeLabel = (st: string) => {
    switch (st) {
      case "send_text": return "テキスト送信";
      case "send_template": return "テンプレート送信";
      case "condition": return "条件分岐";
      case "tag_add": return "タグ追加";
      case "tag_remove": return "タグ除去";
      case "mark_change": return "マーク変更";
      case "menu_change": return "メニュー変更";
      case "wait": return "待機";
      case "ab_test": return "A/Bテスト";
      case "webhook": return "Webhook";
      case "delay_until": return "日時待機";
      case "random": return "ランダム分岐";
      case "goal": return "ゴール";
      case "note": return "メモ";
      default: return st;
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ backgroundColor: colors.bg }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.headerBg }} />
          <span className="text-sm font-bold" style={{ color: colors.text }}>
            {stepTypeLabel(data.step_type)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 設定内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ステップタイプ変更（送信・タグ系のみ） */}
        {(node.type === "send" || node.type === "tag") && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">アクション種別</label>
            <select
              value={data.step_type}
              onChange={(e) => onUpdate({ step_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            >
              {node.type === "send" ? (
                <>
                  <option value="send_text">テキスト送信</option>
                  <option value="send_template">テンプレート送信</option>
                </>
              ) : (
                <>
                  <option value="tag_add">タグ追加</option>
                  <option value="tag_remove">タグ除去</option>
                  <option value="mark_change">マーク変更</option>
                </>
              )}
            </select>
          </div>
        )}

        {/* 待機設定 */}
        {(node.type === "wait" || (node.type !== "condition" && data.step_type !== "condition" && node.type !== "goal" && node.type !== "note")) && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {node.type === "wait" ? "待機時間" : "配信タイミング"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={data.delay_value}
                onChange={(e) => onUpdate({ delay_value: parseInt(e.target.value) || 0 })}
                className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              />
              <select
                value={data.delay_type}
                onChange={(e) => onUpdate({ delay_type: e.target.value })}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              >
                <option value="minutes">分後</option>
                <option value="hours">時間後</option>
                <option value="days">日後</option>
              </select>
            </div>
            {data.delay_type === "days" && (
              <div className="mt-2">
                <label className="block text-xs text-gray-400 mb-1">送信時刻</label>
                <input
                  type="time"
                  value={data.send_time || "10:00"}
                  onChange={(e) => onUpdate({ send_time: e.target.value })}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
                />
              </div>
            )}
          </div>
        )}

        {/* テキスト送信 */}
        {data.step_type === "send_text" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">メッセージ内容</label>
            <textarea
              value={data.content || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={5}
              placeholder="メッセージを入力..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755] resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              変数: {"{name}"} {"{patient_id}"} {"{send_date}"}
            </p>
          </div>
        )}

        {/* テンプレート送信 */}
        {data.step_type === "send_template" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">テンプレートID</label>
            <input
              type="number"
              value={data.template_id || ""}
              onChange={(e) => onUpdate({ template_id: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="テンプレートIDを入力"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>
        )}

        {/* タグ追加/削除 */}
        {(data.step_type === "tag_add" || data.step_type === "tag_remove") && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">タグID</label>
            <input
              type="number"
              value={data.tag_id || ""}
              onChange={(e) => onUpdate({ tag_id: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="タグIDを入力"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>
        )}

        {/* マーク変更 */}
        {data.step_type === "mark_change" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">マーク値</label>
            <input
              type="text"
              value={data.mark || ""}
              onChange={(e) => onUpdate({ mark: e.target.value || null })}
              placeholder="マーク値を入力"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>
        )}

        {/* メニュー変更 */}
        {data.step_type === "menu_change" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">リッチメニューID</label>
            <input
              type="number"
              value={data.menu_id || ""}
              onChange={(e) => onUpdate({ menu_id: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="メニューIDを入力"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
          </div>
        )}

        {/* 条件分岐 */}
        {data.step_type === "condition" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">条件ルール</label>
              {(data.condition_rules?.length || 0) > 0 ? (
                <div className="space-y-1">
                  {data.condition_rules.map((rule, i) => (
                    <div key={i} className="text-xs bg-yellow-50 px-2 py-1.5 rounded border border-yellow-200">
                      {String(rule.type || "")}: {JSON.stringify(rule).substring(0, 60)}...
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded">
                  条件が未設定です。シナリオ編集画面で設定してください。
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-green-600 mb-1">True (条件一致) の接続先</label>
              <p className="text-[10px] text-gray-400">
                ポートからドラッグして接続先ノードにドロップしてください
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-red-600 mb-1">False (条件不一致) の接続先</label>
              <p className="text-[10px] text-gray-400">
                ポートからドラッグして接続先ノードにドロップしてください
              </p>
            </div>
          </div>
        )}

        {/* Webhook設定 */}
        {data.step_type === "webhook" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Webhook URL</label>
            <input
              type="url"
              value={data.content || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="https://example.com/webhook"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755] font-mono text-xs"
            />
          </div>
        )}

        {/* 日時待機設定 */}
        {data.step_type === "delay_until" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">待機条件</label>
            <input
              type="text"
              value={data.content || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="例: 誕生日, 予約日の前日"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
            <p className="text-[10px] text-gray-400 mt-1">特定日時・イベントまで待機します</p>
          </div>
        )}

        {/* ゴール設定 */}
        {data.step_type === "goal" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ゴール名</label>
            <input
              type="text"
              value={data.content || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="例: 予約完了, 購入"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
            />
            <p className="text-[10px] text-gray-400 mt-1">コンバージョン計測ポイントです</p>
          </div>
        )}

        {/* メモ */}
        {data.step_type === "note" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">メモ内容</label>
            <textarea
              value={data.content || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={4}
              placeholder="フローの説明メモを入力..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755] resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">このノードは実行されません（説明用）</p>
          </div>
        )}

        {/* 離脱条件（条件分岐・ゴール・メモ以外） */}
        {!["condition", "wait", "goal", "note"].includes(data.step_type) && (
          <div className="border-t border-gray-100 pt-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">離脱条件</label>
            {(data.exit_condition_rules?.length || 0) > 0 ? (
              <div className="space-y-1 mb-2">
                {data.exit_condition_rules.map((rule, i) => (
                  <div key={i} className="text-xs bg-orange-50 px-2 py-1.5 rounded border border-orange-200">
                    {String(rule.type || "")}: {JSON.stringify(rule).substring(0, 60)}...
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-2">未設定</p>
            )}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">アクション:</label>
              <select
                value={data.exit_action || "exit"}
                onChange={(e) => onUpdate({ exit_action: e.target.value })}
                className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755]"
              >
                <option value="exit">シナリオ離脱</option>
                <option value="skip">スキップ</option>
                <option value="jump">ジャンプ</option>
              </select>
            </div>
          </div>
        )}

        {/* 表示条件（全ステップ共通） */}
        <DisplayConditionsEditor
          displayConditions={data.display_conditions}
          onChange={(dc) => onUpdate({ display_conditions: dc })}
        />

        {/* ノードID（デバッグ用） */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-[10px] text-gray-300">ノードID: {node.id}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- 表示条件エディタコンポーネント ---------- */

/** フィールドタイプの選択肢 */
const FIELD_OPTIONS = [
  { value: "tag_has", label: "タグを持っている" },
  { value: "tag_not_has", label: "タグを持っていない" },
  { value: "custom_field_equals", label: "カスタムフィールド一致" },
  { value: "days_since_start_gte", label: "経過日数（以上）" },
  { value: "days_since_start_lte", label: "経過日数（以下）" },
  { value: "step_completed", label: "ステップ完了済み" },
];

interface DisplayConditionsEditorProps {
  displayConditions: DisplayConditionsData | null;
  onChange: (dc: DisplayConditionsData | null) => void;
}

function DisplayConditionsEditor({ displayConditions, onChange }: DisplayConditionsEditorProps) {
  const conditions = displayConditions?.conditions || [];
  const operator = displayConditions?.operator || "and";

  const addCondition = () => {
    const newConditions = [...conditions, { field: "tag_has", op: "equals", value: "" }];
    onChange({ operator, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    if (newConditions.length === 0) {
      onChange(null);
    } else {
      onChange({ operator, conditions: newConditions });
    }
  };

  const updateCondition = (index: number, patch: Partial<{ field: string; op: string; value: unknown }>) => {
    const newConditions = conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange({ operator, conditions: newConditions });
  };

  const toggleOperator = () => {
    const newOp = operator === "and" ? "or" : "and";
    onChange({ operator: newOp, conditions });
  };

  return (
    <div className="border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-gray-500">表示条件</label>
        {conditions.length > 0 && (
          <button
            onClick={toggleOperator}
            className="px-2 py-0.5 text-[10px] font-bold rounded border transition-colors"
            style={{
              borderColor: operator === "and" ? "#6366f1" : "#f59e0b",
              color: operator === "and" ? "#6366f1" : "#f59e0b",
              backgroundColor: operator === "and" ? "#eef2ff" : "#fffbeb",
            }}
          >
            {operator === "and" ? "AND（全て一致）" : "OR（いずれか一致）"}
          </button>
        )}
      </div>

      {conditions.length === 0 ? (
        <p className="text-xs text-gray-400 mb-2">未設定（常に表示）</p>
      ) : (
        <div className="space-y-2 mb-2">
          {conditions.map((cond, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
              <div className="flex items-center gap-1 mb-1.5">
                <select
                  value={cond.field}
                  onChange={(e) => updateCondition(i, { field: e.target.value, value: "" })}
                  className="flex-1 px-1.5 py-1 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#06C755]"
                >
                  {FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeCondition(i)}
                  className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                  title="条件を削除"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <DisplayConditionValueInput
                field={cond.field}
                value={cond.value}
                onChange={(val) => updateCondition(i, { value: val })}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={addCondition}
        className="w-full py-1.5 text-xs font-medium text-[#06C755] border border-dashed border-[#06C755] rounded-lg hover:bg-green-50 transition-colors"
      >
        + 条件を追加
      </button>
    </div>
  );
}

/* ---------- フィールドタイプ別の値入力 ---------- */

interface DisplayConditionValueInputProps {
  field: string;
  value: unknown;
  onChange: (value: unknown) => void;
}

function DisplayConditionValueInput({ field, value, onChange }: DisplayConditionValueInputProps) {
  switch (field) {
    case "tag_has":
    case "tag_not_has":
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="タグ名を入力"
          className="w-full px-2 py-1 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#06C755]"
        />
      );

    case "custom_field_equals":
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="フィールド名:値 (例: gender:female)"
          className="w-full px-2 py-1 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#06C755]"
        />
      );

    case "days_since_start_gte":
    case "days_since_start_lte":
      return (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            value={value !== undefined && value !== null && value !== "" ? Number(value) : ""}
            onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : "")}
            placeholder="日数"
            className="w-20 px-2 py-1 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#06C755]"
          />
          <span className="text-[10px] text-gray-400">日</span>
        </div>
      );

    case "step_completed":
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ステップID"
          className="w-full px-2 py-1 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#06C755]"
        />
      );

    default:
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="値を入力"
          className="w-full px-2 py-1 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#06C755]"
        />
      );
  }
}
