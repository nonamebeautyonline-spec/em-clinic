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
});
