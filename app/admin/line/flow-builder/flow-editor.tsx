"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  type FlowNode,
  type FlowEdge,
  type FlowGraph,
  type FlowNodeType,
  type StepItemData,
  createNewNode,
  getNodeColor,
} from "./flow-converter";

/* ---------- 型定義 ---------- */

interface FlowEditorProps {
  graph: FlowGraph;
  onChange: (graph: FlowGraph) => void;
  onSelectNode: (node: FlowNode | null) => void;
  selectedNodeId: string | null;
}

interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

interface ConnectState {
  fromNodeId: string;
  fromPort: "bottom" | "true" | "false";
  mouseX: number;
  mouseY: number;
}

interface ViewState {
  panX: number;
  panY: number;
  scale: number;
}

/* ---------- 定数 ---------- */

const PORT_RADIUS = 6;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.0;

/** ツールバーのノード追加ボタン定義 */
const TOOLBAR_ITEMS: { type: FlowNodeType; label: string; icon: string; color: string }[] = [
  { type: "send", label: "送信", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", color: "#3b82f6" },
  { type: "condition", label: "条件分岐", icon: "M8 9l4-4 4 4m0 6l-4 4-4-4", color: "#eab308" },
  { type: "wait", label: "待機", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "#6b7280" },
  { type: "tag", label: "タグ操作", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z", color: "#22c55e" },
  { type: "menu", label: "メニュー", icon: "M4 6h16M4 10h16M4 14h16M4 18h16", color: "#8b5cf6" },
];

/* ---------- メインコンポーネント ---------- */

export default function FlowEditor({ graph, onChange, onSelectNode, selectedNodeId }: FlowEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ドラッグ状態
  const [dragState, setDragState] = useState<DragState | null>(null);
  // エッジ接続中の状態
  const [connectState, setConnectState] = useState<ConnectState | null>(null);
  // パン・ズーム
  const [view, setView] = useState<ViewState>({ panX: 0, panY: 0, scale: 1 });
  // パン操作中
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  /** マウス位置をSVG座標に変換 */
  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - view.panX) / view.scale,
      y: (clientY - rect.top - view.panY) / view.scale,
    };
  }, [view]);

  /* ---------- ノードのドラッグ処理 ---------- */

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return; // 左クリックのみ
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const svgPos = clientToSvg(e.clientX, e.clientY);
    setDragState({
      nodeId,
      offsetX: svgPos.x - node.x,
      offsetY: svgPos.y - node.y,
    });
    onSelectNode(node);
  }, [graph.nodes, clientToSvg, onSelectNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // ノードドラッグ
    if (dragState) {
      const svgPos = clientToSvg(e.clientX, e.clientY);
      const newNodes = graph.nodes.map(n =>
        n.id === dragState.nodeId
          ? { ...n, x: svgPos.x - dragState.offsetX, y: svgPos.y - dragState.offsetY }
          : n
      );
      onChange({ ...graph, nodes: newNodes });
      return;
    }

    // エッジ接続プレビュー
    if (connectState) {
      const svgPos = clientToSvg(e.clientX, e.clientY);
      setConnectState({ ...connectState, mouseX: svgPos.x, mouseY: svgPos.y });
      return;
    }

    // パン操作
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setView(v => ({
        ...v,
        panX: panStartRef.current!.panX + dx,
        panY: panStartRef.current!.panY + dy,
      }));
    }
  }, [dragState, connectState, isPanning, clientToSvg, graph, onChange]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // エッジ接続完了
    if (connectState) {
      const svgPos = clientToSvg(e.clientX, e.clientY);
      // ドロップ先のノードを検出
      const targetNode = graph.nodes.find(n =>
        n.id !== connectState.fromNodeId &&
        svgPos.x >= n.x && svgPos.x <= n.x + n.width &&
        svgPos.y >= n.y && svgPos.y <= n.y + n.height
      );

      if (targetNode) {
        // 既存エッジと重複しないか確認
        const exists = graph.edges.some(
          e => e.from === connectState.fromNodeId && e.fromPort === connectState.fromPort && e.to === targetNode.id
        );
        if (!exists) {
          const newEdge: FlowEdge = {
            id: `edge-${connectState.fromNodeId}-${connectState.fromPort}-${targetNode.id}`,
            from: connectState.fromNodeId,
            to: targetNode.id,
            fromPort: connectState.fromPort,
            toPort: "top",
            label: connectState.fromPort === "true" ? "True" :
                   connectState.fromPort === "false" ? "False" : undefined,
            color: connectState.fromPort === "true" ? "#22c55e" :
                   connectState.fromPort === "false" ? "#ef4444" : undefined,
          };
          onChange({ ...graph, edges: [...graph.edges, newEdge] });
        }
      }
      setConnectState(null);
    }

    setDragState(null);
    setIsPanning(false);
    panStartRef.current = null;
  }, [connectState, clientToSvg, graph, onChange]);

  /* ---------- 背景クリック（パン開始 / 選択解除） ---------- */

  const handleBgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      onSelectNode(null);
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: view.panX,
        panY: view.panY,
      };
    }
  }, [onSelectNode, view]);

  /* ---------- ズーム（ホイール） ---------- */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setView(v => ({
        ...v,
        scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale + delta)),
      }));
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  /* ---------- ポートクリック（エッジ接続開始） ---------- */

  const handlePortMouseDown = useCallback((e: React.MouseEvent, nodeId: string, port: "bottom" | "true" | "false") => {
    e.stopPropagation();
    const svgPos = clientToSvg(e.clientX, e.clientY);
    setConnectState({
      fromNodeId: nodeId,
      fromPort: port,
      mouseX: svgPos.x,
      mouseY: svgPos.y,
    });
  }, [clientToSvg]);

  /* ---------- ノード追加 ---------- */

  const handleAddNode = useCallback((type: FlowNodeType) => {
    // キャンバス中央付近に配置
    const centerX = (-view.panX + 400) / view.scale;
    const centerY = (-view.panY + 300) / view.scale;
    const newNode = createNewNode(type, centerX, centerY);
    onChange({ ...graph, nodes: [...graph.nodes, newNode] });
    onSelectNode(newNode);
  }, [view, graph, onChange, onSelectNode]);

  /* ---------- ノード削除 ---------- */

  const handleDeleteNode = useCallback((nodeId: string) => {
    const newNodes = graph.nodes.filter(n => n.id !== nodeId);
    const newEdges = graph.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    onChange({ nodes: newNodes, edges: newEdges });
    onSelectNode(null);
  }, [graph, onChange, onSelectNode]);

  /* ---------- エッジ削除 ---------- */

  const handleDeleteEdge = useCallback((edgeId: string) => {
    onChange({ ...graph, edges: graph.edges.filter(e => e.id !== edgeId) });
  }, [graph, onChange]);

  /* ---------- ポート座標を計算 ---------- */

  const getPortPosition = useCallback((node: FlowNode, port: "top" | "bottom" | "true" | "false") => {
    switch (port) {
      case "top":
        return { x: node.x + node.width / 2, y: node.y };
      case "bottom":
        return { x: node.x + node.width / 2, y: node.y + node.height };
      case "true":
        return { x: node.x + node.width / 3, y: node.y + node.height };
      case "false":
        return { x: node.x + (node.width * 2) / 3, y: node.y + node.height };
    }
  }, []);

  /* ---------- エッジのパス描画 ---------- */

  const getEdgePath = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const midY = (from.y + to.y) / 2;
    // 上から下への曲線
    if (to.y > from.y) {
      return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
    }
    // 下から上への曲線（ループバック）
    const offsetX = 50;
    return `M ${from.x} ${from.y} C ${from.x} ${from.y + 60}, ${to.x + offsetX} ${to.y - 60}, ${to.x} ${to.y}`;
  }, []);

  /* ---------- レンダリング ---------- */

  return (
    <div className="flex flex-col h-full">
      {/* ツールバー */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <span className="text-xs text-gray-400 mr-2">ノード追加:</span>
        {TOOLBAR_ITEMS.map(item => (
          <button
            key={item.type}
            onClick={() => handleAddNode(item.type)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
            style={{ color: item.color }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {item.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* ズーム表示 */}
          <span className="text-xs text-gray-400">{Math.round(view.scale * 100)}%</span>
          <button
            onClick={() => setView(v => ({ ...v, scale: Math.min(MAX_SCALE, v.scale + 0.1) }))}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="ズームイン"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
          </button>
          <button
            onClick={() => setView(v => ({ ...v, scale: Math.max(MIN_SCALE, v.scale - 0.1) }))}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="ズームアウト"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
          </button>
          <button
            onClick={() => setView({ panX: 0, panY: 0, scale: 1 })}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="ビューをリセット"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* キャンバス */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-gray-50 relative"
        style={{ cursor: isPanning ? "grabbing" : dragState ? "move" : connectState ? "crosshair" : "grab" }}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          onMouseDown={handleBgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* グリッドパターン */}
          <defs>
            <pattern id="grid" width={20 * view.scale} height={20 * view.scale} patternUnits="userSpaceOnUse"
              x={view.panX % (20 * view.scale)} y={view.panY % (20 * view.scale)}>
              <circle cx={1} cy={1} r={0.5} fill="#e5e7eb" />
            </pattern>
            {/* 矢印マーカー */}
            <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M 0 0 L 8 3 L 0 6 Z" fill="#9ca3af" />
            </marker>
            <marker id="arrow-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M 0 0 L 8 3 L 0 6 Z" fill="#22c55e" />
            </marker>
            <marker id="arrow-red" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M 0 0 L 8 3 L 0 6 Z" fill="#ef4444" />
            </marker>
          </defs>

          {/* グリッド背景 */}
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* 変換グループ（パン・ズーム） */}
          <g transform={`translate(${view.panX}, ${view.panY}) scale(${view.scale})`}>
            {/* エッジ描画 */}
            {graph.edges.map(edge => {
              const fromNode = graph.nodes.find(n => n.id === edge.from);
              const toNode = graph.nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const from = getPortPosition(fromNode, edge.fromPort);
              const to = getPortPosition(toNode, edge.toPort);
              const path = getEdgePath(from, to);
              const markerId = edge.color === "#22c55e" ? "arrow-green" :
                               edge.color === "#ef4444" ? "arrow-red" : "arrow";

              return (
                <g key={edge.id}>
                  {/* エッジのクリック領域（太めの透明パス） */}
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                    className="cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); handleDeleteEdge(edge.id); }}
                  />
                  {/* エッジ本体 */}
                  <path
                    d={path}
                    fill="none"
                    stroke={edge.color || "#9ca3af"}
                    strokeWidth={2}
                    strokeDasharray={edge.color ? undefined : "none"}
                    markerEnd={`url(#${markerId})`}
                    className="pointer-events-none"
                  />
                  {/* ラベル */}
                  {edge.label && (
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 8}
                      textAnchor="middle"
                      className="text-[10px] font-medium pointer-events-none select-none"
                      fill={edge.color || "#6b7280"}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 接続プレビュー線 */}
            {connectState && (() => {
              const fromNode = graph.nodes.find(n => n.id === connectState.fromNodeId);
              if (!fromNode) return null;
              const from = getPortPosition(fromNode, connectState.fromPort);
              const path = getEdgePath(from, { x: connectState.mouseX, y: connectState.mouseY });
              return (
                <path
                  d={path}
                  fill="none"
                  stroke="#06C755"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  className="pointer-events-none"
                />
              );
            })()}

            {/* ノード描画 */}
            {graph.nodes.map(node => {
              const colors = getNodeColor(node.type);
              const isSelected = node.id === selectedNodeId;
              const isCondition = node.type === "condition";
              const lines = node.label.split("\n");

              return (
                <g key={node.id} onMouseDown={(e) => handleNodeMouseDown(e, node.id)}>
                  {/* 選択ハイライト */}
                  {isSelected && (
                    <rect
                      x={node.x - 3}
                      y={node.y - 3}
                      width={node.width + 6}
                      height={node.height + 6}
                      rx={10}
                      fill="none"
                      stroke="#06C755"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                    />
                  )}

                  {/* ノード本体 */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    rx={8}
                    fill={colors.bg}
                    stroke={isSelected ? "#06C755" : colors.border}
                    strokeWidth={isSelected ? 2 : 1}
                    className="cursor-move"
                  />

                  {/* ノードヘッダーバー */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={22}
                    rx={8}
                    fill={colors.headerBg}
                    className="pointer-events-none"
                  />
                  <rect
                    x={node.x}
                    y={node.y + 14}
                    width={node.width}
                    height={8}
                    fill={colors.headerBg}
                    className="pointer-events-none"
                  />

                  {/* ノードタイプラベル */}
                  <text
                    x={node.x + 10}
                    y={node.y + 15}
                    className="text-[10px] font-bold pointer-events-none select-none"
                    fill="white"
                  >
                    {node.type === "send" ? "送信" :
                     node.type === "condition" ? "条件分岐" :
                     node.type === "wait" ? "待機" :
                     node.type === "tag" ? "タグ" : "メニュー"}
                  </text>

                  {/* 削除ボタン */}
                  <g
                    className="cursor-pointer opacity-0 hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                  >
                    <circle cx={node.x + node.width - 10} cy={node.y + 11} r={7} fill="white" fillOpacity={0.8} />
                    <text
                      x={node.x + node.width - 10}
                      y={node.y + 15}
                      textAnchor="middle"
                      className="text-[10px] font-bold"
                      fill="#ef4444"
                    >
                      x
                    </text>
                  </g>

                  {/* ノードコンテンツ（複数行対応） */}
                  {lines.map((line, i) => (
                    <text
                      key={i}
                      x={node.x + 10}
                      y={node.y + 38 + i * 16}
                      className={`${i === 0 ? "text-[12px] font-medium" : "text-[10px]"} pointer-events-none select-none`}
                      fill={i === 0 ? colors.text : "#6b7280"}
                    >
                      {line.length > 28 ? line.substring(0, 28) + "..." : line}
                    </text>
                  ))}

                  {/* 入力ポート（上部） */}
                  <circle
                    cx={node.x + node.width / 2}
                    cy={node.y}
                    r={PORT_RADIUS}
                    fill="white"
                    stroke={colors.border}
                    strokeWidth={2}
                    className="cursor-pointer"
                  />

                  {/* 出力ポート */}
                  {isCondition ? (
                    /* 条件分岐: True/False の2つのポート */
                    <>
                      <g onMouseDown={(e) => handlePortMouseDown(e, node.id, "true")}>
                        <circle
                          cx={node.x + node.width / 3}
                          cy={node.y + node.height}
                          r={PORT_RADIUS}
                          fill="#22c55e"
                          stroke="white"
                          strokeWidth={2}
                          className="cursor-crosshair"
                        />
                        <text
                          x={node.x + node.width / 3}
                          y={node.y + node.height + 16}
                          textAnchor="middle"
                          className="text-[9px] pointer-events-none select-none"
                          fill="#22c55e"
                        >
                          True
                        </text>
                      </g>
                      <g onMouseDown={(e) => handlePortMouseDown(e, node.id, "false")}>
                        <circle
                          cx={node.x + (node.width * 2) / 3}
                          cy={node.y + node.height}
                          r={PORT_RADIUS}
                          fill="#ef4444"
                          stroke="white"
                          strokeWidth={2}
                          className="cursor-crosshair"
                        />
                        <text
                          x={node.x + (node.width * 2) / 3}
                          y={node.y + node.height + 16}
                          textAnchor="middle"
                          className="text-[9px] pointer-events-none select-none"
                          fill="#ef4444"
                        >
                          False
                        </text>
                      </g>
                    </>
                  ) : (
                    /* 通常ノード: 1つの出力ポート */
                    <g onMouseDown={(e) => handlePortMouseDown(e, node.id, "bottom")}>
                      <circle
                        cx={node.x + node.width / 2}
                        cy={node.y + node.height}
                        r={PORT_RADIUS}
                        fill={colors.headerBg}
                        stroke="white"
                        strokeWidth={2}
                        className="cursor-crosshair"
                      />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
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
        {(node.type === "wait" || (node.type !== "condition" && data.step_type !== "condition")) && (
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
                  {data.condition_rules.map((rule: any, i: number) => (
                    <div key={i} className="text-xs bg-yellow-50 px-2 py-1.5 rounded border border-yellow-200">
                      {rule.type}: {JSON.stringify(rule).substring(0, 60)}...
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

        {/* 離脱条件（条件分岐以外） */}
        {data.step_type !== "condition" && data.step_type !== "wait" && (
          <div className="border-t border-gray-100 pt-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">離脱条件</label>
            {(data.exit_condition_rules?.length || 0) > 0 ? (
              <div className="space-y-1 mb-2">
                {data.exit_condition_rules.map((rule: any, i: number) => (
                  <div key={i} className="text-xs bg-orange-50 px-2 py-1.5 rounded border border-orange-200">
                    {rule.type}: {JSON.stringify(rule).substring(0, 60)}...
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

        {/* ノードID（デバッグ用） */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-[10px] text-gray-300">ノードID: {node.id}</p>
        </div>
      </div>
    </div>
  );
}
