// lib/__tests__/chatbot-engine.test.ts
// チャットボットエンジンのユニットテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ---------- Supabase モック ---------- */

function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = ["from", "select", "insert", "update", "upsert", "delete", "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte", "like", "ilike", "contains", "containedBy", "filter", "or", "order", "limit", "range", "single", "maybeSingle", "match", "textSearch", "csv", "rpc", "count", "head"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data, error, count: Array.isArray(data) ? data.length : 0 });
  return chain;
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn((id: string | null) => ({ tenant_id: id ?? "test-tenant" })),
}));

// fetch モック（api_call アクション用）
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

const {
  startScenario,
  getNextMessage,
  processUserInput,
  findScenarioByKeyword,
  getActiveSession,
} = await import("@/lib/chatbot-engine");

/* ---------- テスト ---------- */

describe("chatbot-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ---------- startScenario ---------- */

  describe("startScenario - シナリオ開始", () => {
    it("非アクティブなシナリオの場合 null を返す", async () => {
      // シナリオ検索 → 非アクティブ
      mockFrom.mockReturnValue(createMockChain({ id: "s1", is_active: false }));

      const result = await startScenario("patient-1", "s1", "tenant-1");
      expect(result).toBeNull();
    });

    it("シナリオが存在しない場合 null を返す", async () => {
      mockFrom.mockReturnValue(createMockChain(null));

      const result = await startScenario("patient-1", "not-exist", "tenant-1");
      expect(result).toBeNull();
    });

    it("アクティブなシナリオでセッションを作成する", async () => {
      const mockSession = {
        id: "session-1",
        tenant_id: "tenant-1",
        patient_id: "patient-1",
        scenario_id: "s1",
        current_node_id: "node-1",
        context: {},
        started_at: "2026-01-01T00:00:00Z",
        completed_at: null,
      };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // シナリオ存在確認
          return createMockChain({ id: "s1", is_active: true });
        } else if (callCount === 2) {
          // 既存セッション完了処理
          return createMockChain(null);
        } else if (callCount === 3) {
          // 最初のノード取得
          return createMockChain({ id: "node-1" });
        } else {
          // セッション作成
          return createMockChain(mockSession);
        }
      });

      const result = await startScenario("patient-1", "s1", "tenant-1");
      expect(result).toEqual(mockSession);
      expect(result?.current_node_id).toBe("node-1");
    });

    it("セッション作成エラー時に null を返す", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockChain({ id: "s1", is_active: true });
        if (callCount === 2) return createMockChain(null);
        if (callCount === 3) return createMockChain({ id: "node-1" });
        return createMockChain(null, { message: "insert error" });
      });

      const result = await startScenario("patient-1", "s1", "tenant-1");
      expect(result).toBeNull();
    });
  });

  /* ---------- getNextMessage ---------- */

  describe("getNextMessage - 次メッセージ取得", () => {
    it("完了済みまたは存在しないセッションでは null を返す", async () => {
      mockFrom.mockReturnValue(createMockChain(null));

      const result = await getNextMessage("session-1");
      expect(result).toBeNull();
    });

    it("messageノードのテキストを返す", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({
            id: "session-1",
            current_node_id: "node-1",
            completed_at: null,
          });
        }
        return createMockChain({
          id: "node-1",
          node_type: "message",
          data: { text: "こんにちは！" },
          next_node_id: null,
        });
      });

      const result = await getNextMessage("session-1");
      expect(result).toEqual({ type: "text", text: "こんにちは！" });
    });

    it("questionノードで選択肢付きメッセージを返す", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({
            id: "session-1",
            current_node_id: "node-2",
            completed_at: null,
          });
        }
        return createMockChain({
          id: "node-2",
          node_type: "question",
          data: {
            question_text: "選んでください",
            buttons: [
              { label: "A", value: "a", next_node_id: "node-3" },
              { label: "B", value: "b", next_node_id: "node-4" },
            ],
          },
          next_node_id: null,
        });
      });

      const result = await getNextMessage("session-1");
      expect(result?.type).toBe("question");
      expect(result?.text).toBe("選んでください");
      expect(result?.buttons).toHaveLength(2);
      expect(result?.buttons?.[0]).toEqual({ label: "A", value: "a" });
    });
  });

  /* ---------- processUserInput ---------- */

  describe("processUserInput - ユーザー入力処理", () => {
    it("セッションが存在しない場合 null を返す", async () => {
      mockFrom.mockReturnValue(createMockChain(null));

      const result = await processUserInput("session-x", "hello");
      expect(result).toBeNull();
    });

    it("questionノードでボタンのvalueマッチで次ノードへ遷移する", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // セッション取得
          return createMockChain({
            id: "session-1",
            patient_id: "p1",
            current_node_id: "q-node",
            completed_at: null,
            context: {},
          });
        } else if (callCount === 2) {
          // 現在ノード（question）
          return createMockChain({
            id: "q-node",
            node_type: "question",
            data: {
              question_text: "選択してください",
              buttons: [
                { label: "はい", value: "yes", next_node_id: "next-msg" },
                { label: "いいえ", value: "no", next_node_id: "next-other" },
              ],
            },
            next_node_id: null,
          });
        } else if (callCount === 3) {
          // コンテキスト更新
          return createMockChain(null);
        } else if (callCount === 4) {
          // advanceToNextInteractiveNode: 次ノード取得
          return createMockChain({
            id: "next-msg",
            node_type: "message",
            data: { text: "はいですね！" },
            next_node_id: null,
          });
        } else {
          // セッション更新
          return createMockChain(null);
        }
      });

      const result = await processUserInput("session-1", "yes");
      expect(result?.type).toBe("text");
      expect(result?.text).toBe("はいですね！");
    });
  });

  /* ---------- findScenarioByKeyword ---------- */

  describe("findScenarioByKeyword - キーワードマッチ", () => {
    it("完全一致するシナリオを返す", async () => {
      const scenarios = [
        { id: "s1", name: "予約案内", trigger_keyword: "予約" },
        { id: "s2", name: "支払い案内", trigger_keyword: "支払い" },
      ];
      mockFrom.mockReturnValue(createMockChain(scenarios));

      const result = await findScenarioByKeyword("予約", "tenant-1");
      expect(result?.id).toBe("s1");
      expect(result?.name).toBe("予約案内");
    });

    it("部分一致するシナリオを返す", async () => {
      const scenarios = [
        { id: "s1", name: "予約案内", trigger_keyword: "予約" },
      ];
      mockFrom.mockReturnValue(createMockChain(scenarios));

      const result = await findScenarioByKeyword("予約したいです", "tenant-1");
      expect(result?.id).toBe("s1");
    });

    it("マッチしない場合 null を返す", async () => {
      const scenarios = [
        { id: "s1", name: "予約案内", trigger_keyword: "予約" },
      ];
      mockFrom.mockReturnValue(createMockChain(scenarios));

      const result = await findScenarioByKeyword("こんにちは", "tenant-1");
      expect(result).toBeNull();
    });

    it("シナリオが0件の場合 null を返す", async () => {
      mockFrom.mockReturnValue(createMockChain([]));

      const result = await findScenarioByKeyword("予約", "tenant-1");
      expect(result).toBeNull();
    });
  });

  /* ---------- getActiveSession ---------- */

  describe("getActiveSession - アクティブセッション取得", () => {
    it("未完了セッションがあれば返す", async () => {
      const session = {
        id: "session-1",
        tenant_id: "tenant-1",
        patient_id: "p1",
        scenario_id: "s1",
        current_node_id: "node-1",
        context: {},
        started_at: "2026-01-01T00:00:00Z",
        completed_at: null,
      };
      mockFrom.mockReturnValue(createMockChain(session));

      const result = await getActiveSession("p1", "tenant-1");
      expect(result?.id).toBe("session-1");
      expect(result?.completed_at).toBeNull();
    });

    it("未完了セッションがなければ null を返す", async () => {
      mockFrom.mockReturnValue(createMockChain(null));

      const result = await getActiveSession("p1", "tenant-1");
      expect(result).toBeNull();
    });
  });

  /* ---------- processUserInput 追加分岐テスト ---------- */

  describe("processUserInput - conditionノード", () => {
    it("condition評価で条件一致した場合、対応するnext_nodeに遷移する", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // セッション取得
          return createMockChain({
            id: "session-1",
            patient_id: "p1",
            current_node_id: "cond-node",
            completed_at: null,
            context: { answer_q1: "yes" },
          });
        } else if (callCount === 2) {
          // 現在ノード（condition）
          return createMockChain({
            id: "cond-node",
            node_type: "condition",
            data: {
              conditions: [
                { field: "answer_q1", operator: "eq", value: "yes", next_node_id: "yes-msg" },
              ],
              default_next_node_id: "default-msg",
            },
            next_node_id: null,
          });
        } else if (callCount === 3) {
          // advanceToNextInteractiveNode: 次ノード
          return createMockChain({
            id: "yes-msg",
            node_type: "message",
            data: { text: "はいを選択しました" },
            next_node_id: null,
          });
        } else {
          // セッション更新
          return createMockChain(null);
        }
      });

      const result = await processUserInput("session-1", "dummy");
      expect(result?.text).toBe("はいを選択しました");
    });

    it("condition評価でマッチしない場合、default_next_node_idに遷移する", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({
            id: "session-1",
            patient_id: "p1",
            current_node_id: "cond-node",
            completed_at: null,
            context: { answer_q1: "maybe" },
          });
        } else if (callCount === 2) {
          return createMockChain({
            id: "cond-node",
            node_type: "condition",
            data: {
              conditions: [
                { field: "answer_q1", operator: "eq", value: "yes", next_node_id: "yes-msg" },
              ],
              default_next_node_id: "default-msg",
            },
            next_node_id: null,
          });
        } else if (callCount === 3) {
          return createMockChain({
            id: "default-msg",
            node_type: "message",
            data: { text: "デフォルトの応答" },
            next_node_id: null,
          });
        } else {
          return createMockChain(null);
        }
      });

      const result = await processUserInput("session-1", "dummy");
      expect(result?.text).toBe("デフォルトの応答");
    });
  });

  describe("processUserInput - actionノード", () => {
    it("actionノードでtag_addが実行され、次ノードに進む", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({
            id: "session-1",
            patient_id: "p1",
            current_node_id: "action-node",
            completed_at: null,
            context: {},
          });
        } else if (callCount === 2) {
          return createMockChain({
            id: "action-node",
            node_type: "action",
            data: { action_type: "tag_add", tag_id: "tag-1" },
            next_node_id: "next-msg",
          });
        } else if (callCount === 3) {
          // tag_add upsert
          return createMockChain(null);
        } else if (callCount === 4) {
          // advanceToNextInteractiveNode: 次ノード（message）
          return createMockChain({
            id: "next-msg",
            node_type: "message",
            data: { text: "タグ追加後" },
            next_node_id: null,
          });
        } else {
          return createMockChain(null);
        }
      });

      const result = await processUserInput("session-1", "dummy");
      expect(result?.text).toBe("タグ追加後");
    });

    it("actionノード（api_call）でfetchが呼ばれる", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({
            id: "session-1",
            patient_id: "p1",
            current_node_id: "api-node",
            completed_at: null,
            context: {},
          });
        } else if (callCount === 2) {
          return createMockChain({
            id: "api-node",
            node_type: "action",
            data: { action_type: "api_call", api_url: "https://example.com/hook" },
            next_node_id: null,
          });
        } else {
          // セッション完了（next_node_idがnull）
          return createMockChain(null);
        }
      });

      await processUserInput("session-1", "dummy");
      expect(mockFetch).toHaveBeenCalledWith("https://example.com/hook", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  describe("processUserInput - messageノード（next_nodeへ遷移）", () => {
    it("messageノードはそのままnext_node_idへ遷移する", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({
            id: "session-1",
            patient_id: "p1",
            current_node_id: "msg-node",
            completed_at: null,
            context: {},
          });
        } else if (callCount === 2) {
          return createMockChain({
            id: "msg-node",
            node_type: "message",
            data: { text: "最初のメッセージ" },
            next_node_id: "next-q",
          });
        } else if (callCount === 3) {
          // advanceToNextInteractiveNode: 次のquestionノード
          return createMockChain({
            id: "next-q",
            node_type: "question",
            data: { question_text: "次の質問", buttons: [{ label: "A", value: "a" }] },
            next_node_id: null,
          });
        } else {
          return createMockChain(null);
        }
      });

      const result = await processUserInput("session-1", "dummy");
      expect(result?.type).toBe("question");
      expect(result?.text).toBe("次の質問");
    });
  });

  describe("processUserInput - セッション完了", () => {
    it("次ノードがない場合、セッションが完了しnullを返す", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({
            id: "session-1",
            patient_id: "p1",
            current_node_id: "last-msg",
            completed_at: null,
            context: {},
          });
        } else if (callCount === 2) {
          return createMockChain({
            id: "last-msg",
            node_type: "message",
            data: { text: "最後です" },
            next_node_id: null,
          });
        } else {
          // セッション完了更新
          return createMockChain(null);
        }
      });

      const result = await processUserInput("session-1", "dummy");
      expect(result).toBeNull();
    });
  });

  describe("processUserInput - questionノードのlabelマッチ", () => {
    it("labelでもマッチして次ノードに遷移する", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({
            id: "session-1",
            patient_id: "p1",
            current_node_id: "q-node",
            completed_at: null,
            context: {},
          });
        } else if (callCount === 2) {
          return createMockChain({
            id: "q-node",
            node_type: "question",
            data: {
              question_text: "選んで",
              buttons: [{ label: "はい", value: "yes", next_node_id: "yes-msg" }],
            },
            next_node_id: "default-msg",
          });
        } else if (callCount === 3) {
          // context更新
          return createMockChain(null);
        } else if (callCount === 4) {
          return createMockChain({
            id: "yes-msg",
            node_type: "message",
            data: { text: "はいですね" },
            next_node_id: null,
          });
        } else {
          return createMockChain(null);
        }
      });

      // labelの「はい」でマッチ
      const result = await processUserInput("session-1", "はい");
      expect(result?.text).toBe("はいですね");
    });
  });

  /* ---------- findScenarioByKeyword 追加 ---------- */

  describe("findScenarioByKeyword - trigger_keywordがnullのシナリオ", () => {
    it("trigger_keywordがnullのシナリオはスキップされる", async () => {
      const scenarios = [
        { id: "s1", name: "案内", trigger_keyword: null },
        { id: "s2", name: "予約案内", trigger_keyword: "予約" },
      ];
      mockFrom.mockReturnValue(createMockChain(scenarios));

      const result = await findScenarioByKeyword("予約", "tenant-1");
      expect(result?.id).toBe("s2");
    });
  });

  /* ---------- condition演算子テスト ---------- */

  describe("processUserInput - condition演算子（contains, neq, gt, lt）", () => {
    function setupConditionTest(operator: string, value: string, fieldValue: string) {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({
            id: "session-1",
            patient_id: "p1",
            current_node_id: "cond-node",
            completed_at: null,
            context: { field1: fieldValue },
          });
        } else if (callCount === 2) {
          return createMockChain({
            id: "cond-node",
            node_type: "condition",
            data: {
              conditions: [
                { field: "field1", operator, value, next_node_id: "matched-msg" },
              ],
              default_next_node_id: "default-msg",
            },
            next_node_id: null,
          });
        } else if (callCount === 3) {
          return createMockChain({
            id: "matched-msg",
            node_type: "message",
            data: { text: "マッチ" },
            next_node_id: null,
          });
        } else if (callCount === 4) {
          return createMockChain({
            id: "default-msg",
            node_type: "message",
            data: { text: "デフォルト" },
            next_node_id: null,
          });
        } else {
          return createMockChain(null);
        }
      });
    }

    it("contains: フィールドに値が含まれる場合マッチ", async () => {
      setupConditionTest("contains", "hello", "say hello world");
      const result = await processUserInput("session-1", "dummy");
      expect(result?.text).toBe("マッチ");
    });

    it("not_contains: フィールドに値が含まれない場合マッチ", async () => {
      setupConditionTest("not_contains", "goodbye", "say hello world");
      const result = await processUserInput("session-1", "dummy");
      expect(result?.text).toBe("マッチ");
    });

    it("neq: フィールドが値と異なる場合マッチ", async () => {
      setupConditionTest("neq", "no", "yes");
      const result = await processUserInput("session-1", "dummy");
      expect(result?.text).toBe("マッチ");
    });

    it("gt: フィールドが値より大きい場合マッチ", async () => {
      setupConditionTest("gt", "5", "10");
      const result = await processUserInput("session-1", "dummy");
      expect(result?.text).toBe("マッチ");
    });

    it("lt: フィールドが値より小さい場合マッチ", async () => {
      setupConditionTest("lt", "10", "5");
      const result = await processUserInput("session-1", "dummy");
      expect(result?.text).toBe("マッチ");
    });
  });
});
