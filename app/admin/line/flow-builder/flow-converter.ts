// app/admin/line/flow-builder/flow-converter.ts
// step_items 配列 ⇔ フローグラフ（ノード + エッジ）の相互変換

/* ---------- 型定義 ---------- */

/** フローノードの種別 */
export type FlowNodeType =
  | "send"        // 送信ノード（テキスト/テンプレート）
  | "condition"   // 条件分岐ノード
  | "wait"        // 待機ノード
  | "tag"         // タグ操作ノード
  | "menu"        // リッチメニュー切替ノード

/** フローノード */
export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** step_items のデータ（編集用） */
  data: StepItemData;
}

/** step_items から抽出したデータ */
export interface StepItemData {
  step_type: string;
  delay_type: string;
  delay_value: number;
  send_time: string | null;
  content: string | null;
  template_id: number | null;
  tag_id: number | null;
  mark: string | null;
  menu_id: number | null;
  condition_rules: any[];
  branch_true_step: number | null;
  branch_false_step: number | null;
  exit_condition_rules: any[];
  exit_action: string;
  exit_jump_to: number | null;
}

/** フローエッジ */
export interface FlowEdge {
  id: string;
  from: string;        // 始点ノードID
  to: string;          // 終点ノードID
  fromPort: "bottom" | "true" | "false";  // 始点の接続ポート
  toPort: "top";       // 終点の接続ポート
  label?: string;      // エッジのラベル（True/False 等）
  color?: string;      // エッジの色
}

/** フローグラフ全体 */
export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/* ---------- 定数 ---------- */

/** ノードの幅・高さのデフォルト値 */
const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const NODE_GAP_X = 300;
const NODE_GAP_Y = 140;
const START_X = 100;
const START_Y = 80;

/** step_type からノードタイプへの変換マップ */
const STEP_TYPE_TO_NODE_TYPE: Record<string, FlowNodeType> = {
  send_text: "send",
  send_template: "send",
  condition: "condition",
  tag_add: "tag",
  tag_remove: "tag",
  mark_change: "tag",  // タグ操作と同系統で表示
  menu_change: "menu",
};

/** ノードタイプの日本語ラベル */
const NODE_TYPE_LABELS: Record<string, string> = {
  send_text: "テキスト送信",
  send_template: "テンプレート送信",
  condition: "条件分岐",
  tag_add: "タグ追加",
  tag_remove: "タグ除去",
  mark_change: "マーク変更",
  menu_change: "メニュー変更",
};

/* ---------- step_items → FlowGraph 変換 ---------- */

/**
 * step_items の配列からフローグラフに変換する
 * @param items step_items の配列（sort_order昇順）
 * @returns フローグラフ
 */
export function stepsToFlowGraph(items: any[]): FlowGraph {
  if (!items || items.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // ノード配置: 条件分岐の True/False 分岐を考慮したレイアウト
  // 基本は縦方向に並べ、条件分岐のFalse側は右にオフセット
  const branchOffsets: Map<number, number> = new Map(); // sort_order → X offset

  items.forEach((item, index) => {
    const nodeId = `node-${index}`;
    const nodeType = STEP_TYPE_TO_NODE_TYPE[item.step_type] || "send";
    const label = NODE_TYPE_LABELS[item.step_type] || item.step_type;

    // 待機ノードを挿入するかどうか（delay_value > 0 かつ条件分岐でない場合）
    const hasWait = item.step_type !== "condition" && item.delay_value > 0;

    // X位置: 分岐オフセットを考慮
    const xOffset = branchOffsets.get(index) || 0;
    const x = START_X + xOffset;

    // Y位置: 前のノードの下
    const y = START_Y + index * NODE_GAP_Y;

    // 待機ノード
    if (hasWait) {
      const waitId = `wait-${index}`;
      nodes.push({
        id: waitId,
        type: "wait",
        label: formatDelay(item.delay_type, item.delay_value, item.send_time),
        x,
        y: y - NODE_GAP_Y / 3,
        width: NODE_WIDTH,
        height: 50,
        data: {
          step_type: "wait",
          delay_type: item.delay_type,
          delay_value: item.delay_value,
          send_time: item.send_time,
          content: null,
          template_id: null,
          tag_id: null,
          mark: null,
          menu_id: null,
          condition_rules: [],
          branch_true_step: null,
          branch_false_step: null,
          exit_condition_rules: [],
          exit_action: "exit",
          exit_jump_to: null,
        },
      });

      // 前のノードと待機ノードを接続
      if (index > 0) {
        const prevNodeId = `node-${index - 1}`;
        const prevNode = items[index - 1];
        if (prevNode.step_type !== "condition") {
          edges.push({
            id: `edge-${prevNodeId}-${waitId}`,
            from: prevNodeId,
            to: waitId,
            fromPort: "bottom",
            toPort: "top",
          });
        }
      }

      // 待機ノードとメインノードを接続
      edges.push({
        id: `edge-${waitId}-${nodeId}`,
        from: waitId,
        to: nodeId,
        fromPort: "bottom",
        toPort: "top",
      });
    } else if (index > 0) {
      // 待機なしの場合、前のノードと直接接続
      const prevNode = items[index - 1];
      if (prevNode.step_type !== "condition") {
        edges.push({
          id: `edge-node-${index - 1}-${nodeId}`,
          from: `node-${index - 1}`,
          to: nodeId,
          fromPort: "bottom",
          toPort: "top",
        });
      }
    }

    // メインノード
    nodes.push({
      id: nodeId,
      type: nodeType,
      label: buildNodeLabel(item, label),
      x,
      y,
      width: NODE_WIDTH,
      height: nodeType === "condition" ? 100 : NODE_HEIGHT,
      data: extractStepData(item),
    });

    // 条件分岐の場合はエッジを追加
    if (item.step_type === "condition") {
      const trueTarget = item.branch_true_step;
      const falseTarget = item.branch_false_step;

      // True 分岐（条件一致 → 次のステップまたは指定ステップ）
      if (trueTarget !== null && trueTarget !== undefined && trueTarget < items.length) {
        edges.push({
          id: `edge-${nodeId}-true`,
          from: nodeId,
          to: `node-${trueTarget}`,
          fromPort: "true",
          toPort: "top",
          label: "True",
          color: "#22c55e",
        });
      } else if (index + 1 < items.length) {
        // デフォルト: 次のステップ
        edges.push({
          id: `edge-${nodeId}-true`,
          from: nodeId,
          to: `node-${index + 1}`,
          fromPort: "true",
          toPort: "top",
          label: "True",
          color: "#22c55e",
        });
      }

      // False 分岐（条件不一致 → 指定ステップ）
      if (falseTarget !== null && falseTarget !== undefined && falseTarget < items.length) {
        edges.push({
          id: `edge-${nodeId}-false`,
          from: nodeId,
          to: `node-${falseTarget}`,
          fromPort: "false",
          toPort: "top",
          label: "False",
          color: "#ef4444",
        });
        // False先のノードをX方向にオフセット
        branchOffsets.set(falseTarget, NODE_GAP_X);
      }
    }
  });

  return { nodes, edges };
}

/* ---------- FlowGraph → step_items 変換 ---------- */

/**
 * フローグラフを step_items の配列に逆変換する
 * @param graph フローグラフ
 * @returns step_items に相当する配列
 */
export function flowGraphToSteps(graph: FlowGraph): any[] {
  // wait ノードを除外し、sort_order 順（node-N の N）でソート
  const mainNodes = graph.nodes
    .filter(n => n.type !== "wait")
    .sort((a, b) => {
      const aIdx = parseInt(a.id.replace("node-", ""));
      const bIdx = parseInt(b.id.replace("node-", ""));
      return aIdx - bIdx;
    });

  return mainNodes.map((node, sortOrder) => {
    const data = node.data;

    // 待機ノードから delay 情報を取得
    const waitNode = graph.nodes.find(
      n => n.type === "wait" && n.id === `wait-${node.id.replace("node-", "")}`
    );

    const delayType = waitNode?.data.delay_type || data.delay_type || "days";
    const delayValue = waitNode?.data.delay_value ?? data.delay_value ?? 1;
    const sendTime = waitNode?.data.send_time || data.send_time || null;

    // 条件分岐のエッジからジャンプ先を解決
    let branchTrueStep = data.branch_true_step;
    let branchFalseStep = data.branch_false_step;

    if (data.step_type === "condition") {
      const trueEdge = graph.edges.find(e => e.from === node.id && e.fromPort === "true");
      const falseEdge = graph.edges.find(e => e.from === node.id && e.fromPort === "false");

      if (trueEdge) {
        const targetIdx = parseInt(trueEdge.to.replace("node-", ""));
        branchTrueStep = isNaN(targetIdx) ? null : targetIdx;
      }
      if (falseEdge) {
        const targetIdx = parseInt(falseEdge.to.replace("node-", ""));
        branchFalseStep = isNaN(targetIdx) ? null : targetIdx;
      }
    }

    return {
      sort_order: sortOrder,
      step_type: data.step_type === "wait" ? "send_text" : data.step_type,
      delay_type: delayType,
      delay_value: delayValue,
      send_time: sendTime,
      content: data.content || null,
      template_id: data.template_id || null,
      tag_id: data.tag_id || null,
      mark: data.mark || null,
      menu_id: data.menu_id || null,
      condition_rules: data.condition_rules || [],
      branch_true_step: branchTrueStep,
      branch_false_step: branchFalseStep,
      exit_condition_rules: data.exit_condition_rules || [],
      exit_action: data.exit_action || "exit",
      exit_jump_to: data.exit_jump_to ?? null,
    };
  });
}

/* ---------- ヘルパー関数 ---------- */

/** ステップデータを StepItemData に変換 */
function extractStepData(item: any): StepItemData {
  return {
    step_type: item.step_type,
    delay_type: item.delay_type || "days",
    delay_value: item.delay_value ?? 1,
    send_time: item.send_time || null,
    content: item.content || null,
    template_id: item.template_id || null,
    tag_id: item.tag_id || null,
    mark: item.mark || null,
    menu_id: item.menu_id || null,
    condition_rules: item.condition_rules || [],
    branch_true_step: item.branch_true_step ?? null,
    branch_false_step: item.branch_false_step ?? null,
    exit_condition_rules: item.exit_condition_rules || [],
    exit_action: item.exit_action || "exit",
    exit_jump_to: item.exit_jump_to ?? null,
  };
}

/** 遅延設定の表示テキスト */
function formatDelay(delayType: string, delayValue: number, sendTime: string | null): string {
  const unit = delayType === "minutes" ? "分" : delayType === "hours" ? "時間" : "日";
  let text = `${delayValue}${unit}後`;
  if (delayType === "days" && sendTime) {
    text += ` ${sendTime}`;
  }
  return text;
}

/** ノードのラベルを構築 */
function buildNodeLabel(item: any, baseLabel: string): string {
  switch (item.step_type) {
    case "send_text":
      return item.content
        ? `${baseLabel}\n${(item.content as string).substring(0, 30)}${(item.content as string).length > 30 ? "..." : ""}`
        : baseLabel;
    case "send_template":
      return item.template_id
        ? `${baseLabel}\nID: ${item.template_id}`
        : baseLabel;
    case "condition":
      return item.condition_rules?.length > 0
        ? `${baseLabel}\n${item.condition_rules.length}件の条件`
        : baseLabel;
    case "tag_add":
    case "tag_remove":
      return item.tag_id
        ? `${baseLabel}\nタグID: ${item.tag_id}`
        : baseLabel;
    case "menu_change":
      return item.menu_id
        ? `${baseLabel}\nメニューID: ${item.menu_id}`
        : baseLabel;
    default:
      return baseLabel;
  }
}

/** 新しいノードを作成するヘルパー */
export function createNewNode(type: FlowNodeType, x: number, y: number): FlowNode {
  const stepTypeMap: Record<FlowNodeType, string> = {
    send: "send_text",
    condition: "condition",
    wait: "wait",
    tag: "tag_add",
    menu: "menu_change",
  };

  const labelMap: Record<FlowNodeType, string> = {
    send: "テキスト送信",
    condition: "条件分岐",
    wait: "待機",
    tag: "タグ追加",
    menu: "メニュー変更",
  };

  return {
    id: `node-${Date.now()}`,
    type,
    label: labelMap[type],
    x,
    y,
    width: NODE_WIDTH,
    height: type === "condition" ? 100 : NODE_HEIGHT,
    data: {
      step_type: stepTypeMap[type],
      delay_type: type === "wait" ? "days" : "minutes",
      delay_value: type === "wait" ? 1 : 0,
      send_time: type === "wait" ? "10:00" : null,
      content: null,
      template_id: null,
      tag_id: null,
      mark: null,
      menu_id: null,
      condition_rules: [],
      branch_true_step: null,
      branch_false_step: null,
      exit_condition_rules: [],
      exit_action: "exit",
      exit_jump_to: null,
    },
  };
}

/** ノードの色を取得 */
export function getNodeColor(type: FlowNodeType): { bg: string; border: string; text: string; headerBg: string } {
  switch (type) {
    case "send":
      return { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8", headerBg: "#3b82f6" };
    case "condition":
      return { bg: "#fefce8", border: "#fcd34d", text: "#a16207", headerBg: "#eab308" };
    case "wait":
      return { bg: "#f9fafb", border: "#d1d5db", text: "#4b5563", headerBg: "#6b7280" };
    case "tag":
      return { bg: "#f0fdf4", border: "#86efac", text: "#15803d", headerBg: "#22c55e" };
    case "menu":
      return { bg: "#faf5ff", border: "#c4b5fd", text: "#7c3aed", headerBg: "#8b5cf6" };
    default:
      return { bg: "#f9fafb", border: "#d1d5db", text: "#4b5563", headerBg: "#6b7280" };
  }
}
