// lib/flow-validation.ts — フロービルダー検証エンジン（純粋関数）

import type { FlowNode, FlowEdge, FlowGraph, FlowNodeType } from "@/app/admin/line/flow-builder/flow-converter";

/* ---------- 検証結果の型 ---------- */

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: ValidationSeverity;
  nodeId?: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/* ---------- メイン検証関数 ---------- */

/**
 * フローグラフ全体を検証し、問題を報告する
 */
export function validateFlowGraph(graph: FlowGraph): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (graph.nodes.length === 0) {
    return { valid: true, issues: [] };
  }

  // 各検証を実行
  issues.push(...detectLoops(graph));
  issues.push(...detectOrphanNodes(graph));
  issues.push(...detectUnconfiguredNodes(graph));
  issues.push(...detectMissingConnections(graph));
  issues.push(...detectDuplicateEdges(graph));

  const valid = !issues.some(i => i.severity === "error");
  return { valid, issues };
}

/* ---------- 1. ループ検出（有向グラフ巡回検出） ---------- */

/**
 * DFSベースのサイクル検出
 * noteノードは接続を持たないので除外
 */
export function detectLoops(graph: FlowGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const adjacency = buildAdjacencyList(graph);

  // DFS状態: 0=未訪問, 1=処理中（スタック上）, 2=完了
  const state = new Map<string, number>();
  graph.nodes.forEach(n => state.set(n.id, 0));

  // 再帰DFS
  function dfs(nodeId: string, path: string[]): boolean {
    state.set(nodeId, 1);
    path.push(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const neighborState = state.get(neighbor);
      if (neighborState === 1) {
        // ループ検出: pathからサイクル部分を抽出
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        issues.push({
          severity: "error",
          nodeId: neighbor,
          message: `ループが検出されました: ${cycle.join(" → ")} → ${neighbor}`,
          code: "LOOP_DETECTED",
        });
        return true;
      }
      if (neighborState === 0) {
        if (dfs(neighbor, path)) return true;
      }
    }

    state.set(nodeId, 2);
    path.pop();
    return false;
  }

  for (const node of graph.nodes) {
    if (state.get(node.id) === 0) {
      dfs(node.id, []);
    }
  }

  return issues;
}

/* ---------- 2. 孤立ノード検出（到達不能ノード） ---------- */

/**
 * 入力エッジがないノード（ルートノード）からBFSで到達可能なノードを探索し、
 * 到達不能なノードを警告する。noteノードは除外。
 */
export function detectOrphanNodes(graph: FlowGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // noteノードは接続不要
  const relevantNodes = graph.nodes.filter(n => n.type !== "note");
  if (relevantNodes.length <= 1) return issues;

  // 入力エッジを持たないノード = ルート候補（出力エッジを持つもののみ）
  const nodesWithIncoming = new Set(graph.edges.map(e => e.to));
  const nodesWithOutgoing = new Set(graph.edges.map(e => e.from));
  const rootNodes = relevantNodes.filter(n => !nodesWithIncoming.has(n.id) && nodesWithOutgoing.has(n.id));

  if (rootNodes.length === 0) {
    // 出力のみ持つルートがない場合、入力エッジのないノードをルートとみなす
    const fallbackRoots = relevantNodes.filter(n => !nodesWithIncoming.has(n.id));
    if (fallbackRoots.length > 0) {
      rootNodes.push(fallbackRoots[0]);
    } else {
      // 全ノードが入力エッジを持つ = ループのみの可能性
      rootNodes.push(relevantNodes[0]);
    }
  }

  // BFSで到達可能ノードを収集
  const reachable = new Set<string>();
  const adjacency = buildAdjacencyList(graph);
  const queue = rootNodes.map(n => n.id);
  queue.forEach(id => reachable.add(id));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // 到達不能ノードを検出
  for (const node of relevantNodes) {
    if (!reachable.has(node.id)) {
      issues.push({
        severity: "warning",
        nodeId: node.id,
        message: `到達不能なノードです（他のノードから接続されていません）`,
        code: "ORPHAN_NODE",
      });
    }
  }

  return issues;
}

/* ---------- 3. 未設定ノード検出 ---------- */

/**
 * 各ノードタイプに応じて必須フィールドが未設定のノードを検出
 */
export function detectUnconfiguredNodes(graph: FlowGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const node of graph.nodes) {
    const d = node.data;
    const stepType = d.step_type;

    switch (stepType) {
      case "send_text":
        if (!d.content || d.content.trim() === "") {
          issues.push({
            severity: "error",
            nodeId: node.id,
            message: "テキスト送信ノードにメッセージが設定されていません",
            code: "EMPTY_MESSAGE",
          });
        }
        break;

      case "send_template":
        if (!d.template_id) {
          issues.push({
            severity: "error",
            nodeId: node.id,
            message: "テンプレート送信ノードにテンプレートIDが設定されていません",
            code: "EMPTY_TEMPLATE",
          });
        }
        break;

      case "condition":
        if (!d.condition_rules || d.condition_rules.length === 0) {
          issues.push({
            severity: "warning",
            nodeId: node.id,
            message: "条件分岐ノードに条件が設定されていません",
            code: "EMPTY_CONDITION",
          });
        }
        break;

      case "tag_add":
      case "tag_remove":
        if (!d.tag_id) {
          issues.push({
            severity: "error",
            nodeId: node.id,
            message: "タグ操作ノードにタグIDが設定されていません",
            code: "EMPTY_TAG",
          });
        }
        break;

      case "mark_change":
        if (!d.mark) {
          issues.push({
            severity: "warning",
            nodeId: node.id,
            message: "マーク変更ノードにマーク値が設定されていません",
            code: "EMPTY_MARK",
          });
        }
        break;

      case "menu_change":
        if (!d.menu_id) {
          issues.push({
            severity: "error",
            nodeId: node.id,
            message: "メニュー変更ノードにメニューIDが設定されていません",
            code: "EMPTY_MENU",
          });
        }
        break;

      case "webhook":
        if (!d.content || d.content.trim() === "") {
          issues.push({
            severity: "error",
            nodeId: node.id,
            message: "WebhookノードにURLが設定されていません",
            code: "EMPTY_WEBHOOK_URL",
          });
        }
        break;

      case "wait":
        if ((d.delay_value ?? 0) <= 0) {
          issues.push({
            severity: "warning",
            nodeId: node.id,
            message: "待機ノードの待機時間が0です",
            code: "ZERO_WAIT",
          });
        }
        break;
    }
  }

  return issues;
}

/* ---------- 4. 必須接続チェック ---------- */

/**
 * 条件分岐ノードにTrue/False両出力があるか等のチェック
 */
export function detectMissingConnections(graph: FlowGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const node of graph.nodes) {
    // noteノードとgoalノードは出力不要
    if (node.type === "note" || node.type === "goal") continue;

    const outgoingEdges = graph.edges.filter(e => e.from === node.id);

    if (node.type === "condition") {
      const hasTrueEdge = outgoingEdges.some(e => e.fromPort === "true");
      const hasFalseEdge = outgoingEdges.some(e => e.fromPort === "false");

      if (!hasTrueEdge) {
        issues.push({
          severity: "warning",
          nodeId: node.id,
          message: "条件分岐ノードの True 出力が接続されていません",
          code: "MISSING_TRUE_EDGE",
        });
      }
      if (!hasFalseEdge) {
        issues.push({
          severity: "warning",
          nodeId: node.id,
          message: "条件分岐ノードの False 出力が接続されていません",
          code: "MISSING_FALSE_EDGE",
        });
      }
    } else if (node.type === "ab_test" || node.type === "random") {
      // A/Bテスト・ランダムは少なくとも2つの出力が必要
      if (outgoingEdges.length < 2) {
        issues.push({
          severity: "warning",
          nodeId: node.id,
          message: `${node.type === "ab_test" ? "A/Bテスト" : "ランダム分岐"}ノードに2つ以上の出力接続が必要です`,
          code: "MISSING_BRANCH_EDGES",
        });
      }
    } else {
      // 通常ノード: 出力が0の場合は末尾ノード扱い（infoレベル）
      if (outgoingEdges.length === 0) {
        issues.push({
          severity: "info",
          nodeId: node.id,
          message: "フローの末端ノードです（後続の処理がありません）",
          code: "TERMINAL_NODE",
        });
      }
    }
  }

  return issues;
}

/* ---------- 5. 重複エッジ検出 ---------- */

/**
 * 同一ポートから同一ノードへの重複エッジを検出
 */
export function detectDuplicateEdges(graph: FlowGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const edge of graph.edges) {
    const key = `${edge.from}:${edge.fromPort}:${edge.to}`;
    if (seen.has(key)) {
      issues.push({
        severity: "warning",
        message: `重複するエッジがあります: ${edge.from} → ${edge.to}`,
        code: "DUPLICATE_EDGE",
      });
    }
    seen.add(key);
  }

  return issues;
}

/* ---------- ヘルパー ---------- */

/** 隣接リストを構築 */
function buildAdjacencyList(graph: FlowGraph): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  graph.nodes.forEach(n => adj.set(n.id, []));
  graph.edges.forEach(e => {
    const neighbors = adj.get(e.from);
    if (neighbors) neighbors.push(e.to);
  });
  return adj;
}
