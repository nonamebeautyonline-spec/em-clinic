// lib/__tests__/flow-validation.test.ts
import { describe, test, expect } from "vitest";
import {
  validateFlowGraph,
  detectLoops,
  detectOrphanNodes,
  detectUnconfiguredNodes,
  detectMissingConnections,
  detectDuplicateEdges,
} from "@/lib/flow-validation";
import type { FlowNode, FlowEdge, FlowGraph } from "@/app/admin/line/flow-builder/flow-converter";

/* ---------- ヘルパー ---------- */

function makeNode(id: string, type: FlowNode["type"], overrides?: Partial<FlowNode>): FlowNode {
  return {
    id,
    type,
    label: id,
    x: 0,
    y: 0,
    width: 220,
    height: 80,
    data: {
      step_type: type === "send" ? "send_text" : type === "tag" ? "tag_add" : type,
      delay_type: "days",
      delay_value: 1,
      send_time: null,
      content: type === "send" ? "テスト" : null,
      template_id: null,
      tag_id: type === "tag" ? 1 : null,
      mark: null,
      menu_id: type === "menu" ? 1 : null,
      condition_rules: type === "condition" ? [{ type: "tag" }] : [],
      branch_true_step: null,
      branch_false_step: null,
      exit_condition_rules: [],
      exit_action: "exit",
      exit_jump_to: null,
      display_conditions: null,
      ...overrides?.data,
    },
    ...overrides,
  };
}

function makeEdge(from: string, to: string, fromPort: FlowEdge["fromPort"] = "bottom"): FlowEdge {
  return {
    id: `${from}-${fromPort}-${to}`,
    from,
    to,
    fromPort,
    toPort: "top",
  };
}

/* ---------- テスト ---------- */

describe("validateFlowGraph", () => {
  test("空のグラフは valid", () => {
    const result = validateFlowGraph({ nodes: [], edges: [] });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test("正常なリニアフローは valid", () => {
    const graph: FlowGraph = {
      nodes: [
        makeNode("n1", "send"),
        makeNode("n2", "wait"),
        makeNode("n3", "send"),
      ],
      edges: [
        makeEdge("n1", "n2"),
        makeEdge("n2", "n3"),
      ],
    };
    const result = validateFlowGraph(graph);
    // n3は末端ノード（info）だがerror/warningなし
    expect(result.valid).toBe(true);
    expect(result.issues.filter(i => i.severity === "error")).toHaveLength(0);
  });
});

describe("detectLoops", () => {
  test("ループなしの場合は空", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("a", "send"), makeNode("b", "send")],
      edges: [makeEdge("a", "b")],
    };
    expect(detectLoops(graph)).toHaveLength(0);
  });

  test("直接ループを検出", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("a", "send"), makeNode("b", "send")],
      edges: [makeEdge("a", "b"), makeEdge("b", "a")],
    };
    const issues = detectLoops(graph);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].code).toBe("LOOP_DETECTED");
  });

  test("間接ループを検出", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("a", "send"), makeNode("b", "send"), makeNode("c", "send")],
      edges: [makeEdge("a", "b"), makeEdge("b", "c"), makeEdge("c", "a")],
    };
    const issues = detectLoops(graph);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].code).toBe("LOOP_DETECTED");
  });

  test("自己ループを検出", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("a", "send")],
      edges: [makeEdge("a", "a")],
    };
    const issues = detectLoops(graph);
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe("detectOrphanNodes", () => {
  test("全ノード接続済みの場合は空", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("a", "send"), makeNode("b", "send")],
      edges: [makeEdge("a", "b")],
    };
    expect(detectOrphanNodes(graph)).toHaveLength(0);
  });

  test("孤立ノードを検出", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("a", "send"), makeNode("b", "send"), makeNode("c", "send")],
      edges: [makeEdge("a", "b")],
    };
    const issues = detectOrphanNodes(graph);
    expect(issues.length).toBe(1);
    expect(issues[0].nodeId).toBe("c");
    expect(issues[0].code).toBe("ORPHAN_NODE");
  });

  test("noteノードは孤立ノード検出対象外", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("a", "send"), makeNode("n", "note")],
      edges: [],
    };
    const issues = detectOrphanNodes(graph);
    // noteは除外されるのでaだけ（1ノードなので孤立なし）
    expect(issues.filter(i => i.code === "ORPHAN_NODE")).toHaveLength(0);
  });
});

describe("detectUnconfiguredNodes", () => {
  test("設定済みノードは問題なし", () => {
    const graph: FlowGraph = {
      nodes: [
        makeNode("a", "send", { data: { step_type: "send_text", content: "テスト" } } as Partial<FlowNode>),
      ],
      edges: [],
    };
    const issues = detectUnconfiguredNodes(graph);
    expect(issues.filter(i => i.code === "EMPTY_MESSAGE")).toHaveLength(0);
  });

  test("空メッセージのsend_textを検出", () => {
    const graph: FlowGraph = {
      nodes: [
        makeNode("a", "send", { data: { step_type: "send_text", content: "" } } as Partial<FlowNode>),
      ],
      edges: [],
    };
    const issues = detectUnconfiguredNodes(graph);
    expect(issues.some(i => i.code === "EMPTY_MESSAGE")).toBe(true);
  });

  test("テンプレートID未設定を検出", () => {
    const graph: FlowGraph = {
      nodes: [
        makeNode("a", "send", { data: { step_type: "send_template", template_id: null } } as Partial<FlowNode>),
      ],
      edges: [],
    };
    const issues = detectUnconfiguredNodes(graph);
    expect(issues.some(i => i.code === "EMPTY_TEMPLATE")).toBe(true);
  });

  test("条件未設定の条件分岐を検出", () => {
    const graph: FlowGraph = {
      nodes: [
        makeNode("a", "condition", { data: { step_type: "condition", condition_rules: [] } } as Partial<FlowNode>),
      ],
      edges: [],
    };
    const issues = detectUnconfiguredNodes(graph);
    expect(issues.some(i => i.code === "EMPTY_CONDITION")).toBe(true);
  });

  test("タグID未設定を検出", () => {
    const graph: FlowGraph = {
      nodes: [
        makeNode("a", "tag", { data: { step_type: "tag_add", tag_id: null } } as Partial<FlowNode>),
      ],
      edges: [],
    };
    const issues = detectUnconfiguredNodes(graph);
    expect(issues.some(i => i.code === "EMPTY_TAG")).toBe(true);
  });

  test("Webhook URL未設定を検出", () => {
    const graph: FlowGraph = {
      nodes: [
        makeNode("a", "webhook", { data: { step_type: "webhook", content: "" } } as Partial<FlowNode>),
      ],
      edges: [],
    };
    const issues = detectUnconfiguredNodes(graph);
    expect(issues.some(i => i.code === "EMPTY_WEBHOOK_URL")).toBe(true);
  });

  test("待機時間0を検出", () => {
    const graph: FlowGraph = {
      nodes: [
        makeNode("a", "wait", { data: { step_type: "wait", delay_value: 0 } } as Partial<FlowNode>),
      ],
      edges: [],
    };
    const issues = detectUnconfiguredNodes(graph);
    expect(issues.some(i => i.code === "ZERO_WAIT")).toBe(true);
  });
});

describe("detectMissingConnections", () => {
  test("条件分岐にTrue/False両方あれば問題なし", () => {
    const graph: FlowGraph = {
      nodes: [
        makeNode("c", "condition"),
        makeNode("t", "send"),
        makeNode("f", "send"),
      ],
      edges: [
        makeEdge("c", "t", "true"),
        makeEdge("c", "f", "false"),
      ],
    };
    const issues = detectMissingConnections(graph);
    expect(issues.filter(i => i.code === "MISSING_TRUE_EDGE")).toHaveLength(0);
    expect(issues.filter(i => i.code === "MISSING_FALSE_EDGE")).toHaveLength(0);
  });

  test("条件分岐のTrue出力がない場合を検出", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("c", "condition"), makeNode("f", "send")],
      edges: [makeEdge("c", "f", "false")],
    };
    const issues = detectMissingConnections(graph);
    expect(issues.some(i => i.code === "MISSING_TRUE_EDGE")).toBe(true);
  });

  test("条件分岐のFalse出力がない場合を検出", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("c", "condition"), makeNode("t", "send")],
      edges: [makeEdge("c", "t", "true")],
    };
    const issues = detectMissingConnections(graph);
    expect(issues.some(i => i.code === "MISSING_FALSE_EDGE")).toBe(true);
  });

  test("A/Bテストに出力が1つしかない場合を検出", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("ab", "ab_test"), makeNode("a", "send")],
      edges: [makeEdge("ab", "a", "bottom")],
    };
    const issues = detectMissingConnections(graph);
    expect(issues.some(i => i.code === "MISSING_BRANCH_EDGES")).toBe(true);
  });

  test("末端ノードはinfoレベル", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("a", "send")],
      edges: [],
    };
    const issues = detectMissingConnections(graph);
    const terminal = issues.filter(i => i.code === "TERMINAL_NODE");
    expect(terminal.length).toBe(1);
    expect(terminal[0].severity).toBe("info");
  });

  test("goalノードは出力不要", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("g", "goal")],
      edges: [],
    };
    const issues = detectMissingConnections(graph);
    expect(issues.filter(i => i.code === "TERMINAL_NODE")).toHaveLength(0);
  });

  test("noteノードは出力不要", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("n", "note")],
      edges: [],
    };
    const issues = detectMissingConnections(graph);
    expect(issues.filter(i => i.code === "TERMINAL_NODE")).toHaveLength(0);
  });
});

describe("detectDuplicateEdges", () => {
  test("重複なしの場合は空", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("a", "send"), makeNode("b", "send")],
      edges: [makeEdge("a", "b")],
    };
    expect(detectDuplicateEdges(graph)).toHaveLength(0);
  });

  test("重複エッジを検出", () => {
    const graph: FlowGraph = {
      nodes: [makeNode("a", "send"), makeNode("b", "send")],
      edges: [
        makeEdge("a", "b"),
        { id: "dup", from: "a", to: "b", fromPort: "bottom", toPort: "top" },
      ],
    };
    const issues = detectDuplicateEdges(graph);
    expect(issues.length).toBe(1);
    expect(issues[0].code).toBe("DUPLICATE_EDGE");
  });
});

describe("総合テスト", () => {
  test("条件分岐付きフローの正常ケース", () => {
    const graph: FlowGraph = {
      nodes: [
        makeNode("start", "send"),
        makeNode("cond", "condition"),
        makeNode("yes", "send"),
        makeNode("no", "tag"),
        makeNode("end", "goal"),
      ],
      edges: [
        makeEdge("start", "cond"),
        makeEdge("cond", "yes", "true"),
        makeEdge("cond", "no", "false"),
        makeEdge("yes", "end"),
        makeEdge("no", "end"),
      ],
    };
    const result = validateFlowGraph(graph);
    expect(result.valid).toBe(true);
    expect(result.issues.filter(i => i.severity === "error")).toHaveLength(0);
  });

  test("複数の問題があるフロー", () => {
    const graph: FlowGraph = {
      nodes: [
        makeNode("a", "send", { data: { step_type: "send_text", content: "" } } as Partial<FlowNode>),
        makeNode("b", "condition", { data: { step_type: "condition", condition_rules: [] } } as Partial<FlowNode>),
        makeNode("orphan", "send"),
      ],
      edges: [makeEdge("a", "b")],
    };
    const result = validateFlowGraph(graph);
    expect(result.valid).toBe(false);
    // EMPTY_MESSAGE (error), EMPTY_CONDITION (warning), ORPHAN_NODE (warning), MISSING_TRUE/FALSE_EDGE (warning)
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
  });
});
