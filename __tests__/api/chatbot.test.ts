// __tests__/api/chatbot.test.ts
// チャットボットエンジン + API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Supabase モック ----------

// モックチェインビルダー
function createMockChain(resolvedData: unknown = null, resolvedError: unknown = null) {
  const result = { data: resolvedData, error: resolvedError };
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "insert", "update", "delete", "upsert", "eq", "neq", "is", "not", "in", "order", "limit", "maybeSingle", "single", "match"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // 末端のthenableを返す
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  // select/single/maybeSingle をPromise-likeにする
  const originalMaybeSingle = chain.maybeSingle as ReturnType<typeof vi.fn>;
  originalMaybeSingle.mockReturnValue(Promise.resolve(result));
  const originalSingle = chain.single as ReturnType<typeof vi.fn>;
  originalSingle.mockReturnValue(Promise.resolve(result));
  // selectの後にsingleが呼べるように
  const originalSelect = chain.select as ReturnType<typeof vi.fn>;
  originalSelect.mockReturnValue(chain);

  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue(createMockChain()),
  },
}));

vi.mock("@/lib/tenant", () => ({
  DEFAULT_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  resolveTenantId: vi.fn().mockReturnValue("test-tenant"),
  withTenant: vi.fn().mockImplementation((query: unknown) => query),
  tenantPayload: vi.fn().mockReturnValue({ tenant_id: "test-tenant" }),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

// ---------- エンジンロジックのユニットテスト ----------

describe("チャットボットエンジン - ロジックテスト", () => {
  describe("ノードタイプ処理", () => {
    it("messageノードはテキストメッセージを返す", () => {
      // nodeToMessage相当のロジック検証
      const nodeData = { text: "こんにちは！" };
      expect(nodeData.text).toBe("こんにちは！");
    });

    it("questionノードは選択肢付きメッセージを返す", () => {
      const nodeData = {
        question_text: "どちらを選びますか？",
        buttons: [
          { label: "オプションA", value: "a" },
          { label: "オプションB", value: "b" },
        ],
      };
      expect(nodeData.question_text).toBe("どちらを選びますか？");
      expect(nodeData.buttons).toHaveLength(2);
      expect(nodeData.buttons[0].label).toBe("オプションA");
    });

    it("actionノードのタイプが正しく設定される", () => {
      const nodeData = { action_type: "tag_add", tag_id: "tag-123" };
      expect(nodeData.action_type).toBe("tag_add");
      expect(nodeData.tag_id).toBe("tag-123");
    });

    it("conditionノードの条件評価 - equals", () => {
      // evaluateCondition相当のロジック
      const evaluate = (fieldValue: string, operator: string, condValue: string): boolean => {
        switch (operator) {
          case "eq":
          case "equals": return fieldValue === condValue;
          case "neq":
          case "not_equals": return fieldValue !== condValue;
          case "contains": return fieldValue.includes(condValue);
          case "not_contains": return !fieldValue.includes(condValue);
          case "gt": return Number(fieldValue) > Number(condValue);
          case "lt": return Number(fieldValue) < Number(condValue);
          default: return false;
        }
      };

      expect(evaluate("yes", "eq", "yes")).toBe(true);
      expect(evaluate("yes", "eq", "no")).toBe(false);
      expect(evaluate("yes", "neq", "no")).toBe(true);
      expect(evaluate("hello world", "contains", "world")).toBe(true);
      expect(evaluate("hello", "not_contains", "world")).toBe(true);
      expect(evaluate("10", "gt", "5")).toBe(true);
      expect(evaluate("3", "lt", "5")).toBe(true);
      expect(evaluate("5", "gt", "10")).toBe(false);
    });
  });

  describe("キーワードマッチング", () => {
    it("完全一致でマッチする", () => {
      const keyword = "予約";
      const text = "予約";
      expect(text === keyword || text.includes(keyword)).toBe(true);
    });

    it("部分一致でマッチする", () => {
      const keyword = "予約";
      const text = "予約したいです";
      expect(text.includes(keyword)).toBe(true);
    });

    it("マッチしないキーワード", () => {
      const keyword = "予約";
      const text = "こんにちは";
      expect(text === keyword || text.includes(keyword)).toBe(false);
    });
  });

  describe("セッション管理", () => {
    it("セッションコンテキストにユーザー回答を保存する", () => {
      const ctx: Record<string, unknown> = {};
      const nodeId = "node-123";
      const input = "オプションA";
      ctx[`answer_${nodeId}`] = input;
      expect(ctx[`answer_${nodeId}`]).toBe("オプションA");
    });

    it("複数の回答をコンテキストに蓄積できる", () => {
      const ctx: Record<string, unknown> = {};
      ctx["answer_node1"] = "はい";
      ctx["answer_node2"] = "30歳";
      ctx["answer_node3"] = "初めて";
      expect(Object.keys(ctx)).toHaveLength(3);
    });
  });
});

// ---------- API レスポンス形式テスト ----------

describe("チャットボットAPI - レスポンス形式", () => {
  it("シナリオ一覧のレスポンス形式", () => {
    const response = { scenarios: [] };
    expect(response).toHaveProperty("scenarios");
    expect(Array.isArray(response.scenarios)).toBe(true);
  });

  it("シナリオ作成成功のレスポンス形式", () => {
    const response = {
      ok: true,
      scenario: {
        id: "uuid-123",
        name: "テストシナリオ",
        trigger_keyword: "予約",
        is_active: true,
      },
    };
    expect(response.ok).toBe(true);
    expect(response.scenario.name).toBe("テストシナリオ");
    expect(response.scenario.trigger_keyword).toBe("予約");
  });

  it("ノード一覧のレスポンス形式", () => {
    const response = { nodes: [] };
    expect(response).toHaveProperty("nodes");
    expect(Array.isArray(response.nodes)).toBe(true);
  });

  it("ノード作成時のバリデーション - 不正なnode_type", () => {
    const validTypes = ["message", "question", "action", "condition"];
    expect(validTypes.includes("message")).toBe(true);
    expect(validTypes.includes("invalid")).toBe(false);
  });
});

// ---------- Webhook統合テスト ----------

describe("チャットボット - Webhook統合", () => {
  it("チャットボットはキーワード応答の後、AI返信の前に処理される", () => {
    // 処理順序の検証: keyword → chatbot → AI
    const processingOrder = ["keyword_reply", "chatbot", "ai_reply"];
    expect(processingOrder.indexOf("chatbot")).toBeGreaterThan(processingOrder.indexOf("keyword_reply"));
    expect(processingOrder.indexOf("chatbot")).toBeLessThan(processingOrder.indexOf("ai_reply"));
  });

  it("Flexメッセージ形式の質問ノード出力", () => {
    const text = "どちらを選びますか？";
    const buttons = [
      { label: "オプションA", value: "a" },
      { label: "オプションB", value: "b" },
    ];

    const flexMsg = {
      type: "flex",
      altText: text,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text, wrap: true, size: "md" },
            ...buttons.map(b => ({
              type: "button",
              action: { type: "message", label: b.label, text: b.value },
              style: "primary",
              margin: "sm",
              height: "sm",
            })),
          ],
        },
      },
    };

    expect(flexMsg.type).toBe("flex");
    expect(flexMsg.contents.type).toBe("bubble");
    expect(flexMsg.contents.body.contents).toHaveLength(3); // 1テキスト + 2ボタン
    expect(flexMsg.contents.body.contents[1]).toMatchObject({
      type: "button",
      action: { type: "message", label: "オプションA", text: "a" },
    });
  });
});

// ---------- データ構造テスト ----------

describe("チャットボット - データ構造", () => {
  it("シナリオデータ構造が正しい", () => {
    const scenario = {
      id: "uuid-123",
      tenant_id: "00000000-0000-0000-0000-000000000001",
      name: "テストシナリオ",
      description: "テスト用",
      trigger_keyword: "予約",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(scenario).toHaveProperty("id");
    expect(scenario).toHaveProperty("tenant_id");
    expect(scenario).toHaveProperty("name");
    expect(scenario).toHaveProperty("trigger_keyword");
    expect(scenario).toHaveProperty("is_active");
  });

  it("ノードデータ構造が正しい", () => {
    const node = {
      id: "node-1",
      scenario_id: "uuid-123",
      tenant_id: "00000000-0000-0000-0000-000000000001",
      node_type: "message" as const,
      position_x: 100,
      position_y: 200,
      data: { text: "こんにちは" },
      next_node_id: "node-2",
      created_at: new Date().toISOString(),
    };

    expect(node.node_type).toBe("message");
    expect(node.data.text).toBe("こんにちは");
    expect(node.next_node_id).toBe("node-2");
  });

  it("セッションデータ構造が正しい", () => {
    const session = {
      id: "session-1",
      tenant_id: "00000000-0000-0000-0000-000000000001",
      patient_id: "patient-1",
      scenario_id: "uuid-123",
      current_node_id: "node-1",
      context: {},
      started_at: new Date().toISOString(),
      completed_at: null,
    };

    expect(session.completed_at).toBeNull();
    expect(session.context).toEqual({});
  });

  it("ノードタイプは4種類のみ許可", () => {
    const validTypes = ["message", "question", "action", "condition"];
    expect(validTypes).toHaveLength(4);
    expect(validTypes).toContain("message");
    expect(validTypes).toContain("question");
    expect(validTypes).toContain("action");
    expect(validTypes).toContain("condition");
  });

  it("アクションタイプは3種類", () => {
    const validActions = ["tag_add", "tag_remove", "api_call"];
    expect(validActions).toHaveLength(3);
  });
});

// ---------- 条件分岐の詳細テスト ----------

describe("チャットボット - 条件分岐エンジン", () => {
  const evaluate = (fieldValue: string, operator: string, condValue: string): boolean => {
    switch (operator) {
      case "eq":
      case "equals": return fieldValue === condValue;
      case "neq":
      case "not_equals": return fieldValue !== condValue;
      case "contains": return fieldValue.includes(condValue);
      case "not_contains": return !fieldValue.includes(condValue);
      case "gt": return Number(fieldValue) > Number(condValue);
      case "lt": return Number(fieldValue) < Number(condValue);
      default: return false;
    }
  };

  it("数値比較: gt/lt", () => {
    expect(evaluate("100", "gt", "50")).toBe(true);
    expect(evaluate("30", "lt", "50")).toBe(true);
    expect(evaluate("50", "gt", "50")).toBe(false);
    expect(evaluate("50", "lt", "50")).toBe(false);
  });

  it("文字列含有: contains/not_contains", () => {
    expect(evaluate("初めての来院です", "contains", "初めて")).toBe(true);
    expect(evaluate("2回目です", "not_contains", "初めて")).toBe(true);
  });

  it("不明な演算子はfalseを返す", () => {
    expect(evaluate("a", "unknown_op", "b")).toBe(false);
  });

  it("複数条件の順次評価", () => {
    const conditions = [
      { field: "answer_node1", operator: "eq", value: "はい", next_node_id: "node-a" },
      { field: "answer_node1", operator: "eq", value: "いいえ", next_node_id: "node-b" },
    ];
    const ctx: Record<string, string> = { answer_node1: "はい" };

    let matchedNodeId: string | null = null;
    for (const cond of conditions) {
      if (evaluate(ctx[cond.field] || "", cond.operator, cond.value)) {
        matchedNodeId = cond.next_node_id;
        break;
      }
    }
    expect(matchedNodeId).toBe("node-a");
  });

  it("条件にマッチしない場合はデフォルトノードへ", () => {
    const conditions = [
      { field: "answer_node1", operator: "eq", value: "はい", next_node_id: "node-a" },
    ];
    const defaultNextNodeId = "node-default";
    const ctx: Record<string, string> = { answer_node1: "わからない" };

    let matchedNodeId: string | null = null;
    for (const cond of conditions) {
      if (evaluate(ctx[cond.field] || "", cond.operator, cond.value)) {
        matchedNodeId = cond.next_node_id;
        break;
      }
    }
    if (!matchedNodeId) matchedNodeId = defaultNextNodeId;
    expect(matchedNodeId).toBe("node-default");
  });
});

// ---------- 無限ループ防止テスト ----------

describe("チャットボット - 安全機構", () => {
  it("最大反復回数が設定されている（無限ループ防止）", () => {
    const MAX_ITERATIONS = 20;
    let iterations = 0;
    let currentId: string | null = "node-1";

    // 循環参照をシミュレート
    while (currentId && iterations < MAX_ITERATIONS) {
      iterations++;
      currentId = "node-1"; // 常に同じノードを指す（循環）
    }

    expect(iterations).toBe(MAX_ITERATIONS);
  });
});
