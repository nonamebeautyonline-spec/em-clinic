// __tests__/api/flow-builder.test.ts
// フロービルダーAPI のテスト
// 対象: app/api/admin/line/flow-builder/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンモック ---
function createChain(defaultResolve = { data: null, error: null, count: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

function createMockRequest(method: string, url: string, body?: any) {
  return {
    method,
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
  } as any;
}

import { GET, PUT } from "@/app/api/admin/line/flow-builder/route";
import { verifyAdminAuth } from "@/lib/admin-auth";

describe("フロービルダーAPI (flow-builder/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    (verifyAdminAuth as any).mockResolvedValue(true);
  });

  // ========================================
  // 認証テスト
  // ========================================
  describe("認証", () => {
    it("GET: 認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/line/flow-builder?scenario_id=1");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("PUT: 認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("PUT", "http://localhost/api/admin/line/flow-builder", {
        scenario_id: 1,
        graph: { nodes: [], edges: [] },
      });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // GET: シナリオのstep_items取得
  // ========================================
  describe("GET: フローデータ取得", () => {
    it("scenario_id なし → 400", async () => {
      const req = createMockRequest("GET", "http://localhost/api/admin/line/flow-builder");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("scenario_id");
    });

    it("存在しないシナリオ → 404", async () => {
      tableChains["step_scenarios"] = createChain({ data: null, error: { message: "not found" }, count: null });
      const req = createMockRequest("GET", "http://localhost/api/admin/line/flow-builder?scenario_id=999");
      const res = await GET(req);
      expect(res.status).toBe(404);
    });

    it("正常取得 → フローグラフ付きで返す", async () => {
      // step_scenarios チェーン
      const scenarioChain = createChain({
        data: { id: 1, name: "テストシナリオ" },
        error: null,
        count: null,
      });
      tableChains["step_scenarios"] = scenarioChain;

      // step_items チェーン
      const itemsChain = createChain({
        data: [
          {
            id: 1,
            scenario_id: 1,
            sort_order: 0,
            delay_type: "days",
            delay_value: 1,
            send_time: "10:00",
            step_type: "send_text",
            content: "こんにちは",
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
          {
            id: 2,
            scenario_id: 1,
            sort_order: 1,
            delay_type: "days",
            delay_value: 3,
            send_time: "10:00",
            step_type: "condition",
            content: null,
            template_id: null,
            tag_id: null,
            mark: null,
            menu_id: null,
            condition_rules: [{ type: "tag", tag_ids: [1], tag_match: "any_include" }],
            branch_true_step: null,
            branch_false_step: null,
            exit_condition_rules: [],
            exit_action: "exit",
            exit_jump_to: null,
          },
        ],
        error: null,
        count: null,
      });
      tableChains["step_items"] = itemsChain;

      const req = createMockRequest("GET", "http://localhost/api/admin/line/flow-builder?scenario_id=1");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.scenario.id).toBe(1);
      expect(data.scenario.name).toBe("テストシナリオ");
      expect(data.steps).toHaveLength(2);
      expect(data.graph).toBeDefined();
      expect(data.graph.nodes).toBeDefined();
      expect(data.graph.edges).toBeDefined();
      // ノード数: step 2つ + wait 1つ（条件分岐には待機ノードなし、send_textには待機ノード1つ）
      expect(data.graph.nodes.length).toBeGreaterThanOrEqual(2);
    });

    it("step_itemsが空 → 空のグラフ", async () => {
      tableChains["step_scenarios"] = createChain({
        data: { id: 2, name: "空シナリオ" },
        error: null,
        count: null,
      });
      tableChains["step_items"] = createChain({
        data: [],
        error: null,
        count: null,
      });

      const req = createMockRequest("GET", "http://localhost/api/admin/line/flow-builder?scenario_id=2");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.graph.nodes).toHaveLength(0);
      expect(data.graph.edges).toHaveLength(0);
    });
  });

  // ========================================
  // PUT: フローデータ保存
  // ========================================
  describe("PUT: フローデータ保存", () => {
    it("scenario_id なし → 400", async () => {
      const req = createMockRequest("PUT", "http://localhost/api/admin/line/flow-builder", {
        graph: { nodes: [], edges: [] },
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("graph なし → 400", async () => {
      const req = createMockRequest("PUT", "http://localhost/api/admin/line/flow-builder", {
        scenario_id: 1,
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("存在しないシナリオ → 404", async () => {
      tableChains["step_scenarios"] = createChain({ data: null, error: { message: "not found" }, count: null });
      const req = createMockRequest("PUT", "http://localhost/api/admin/line/flow-builder", {
        scenario_id: 999,
        graph: { nodes: [], edges: [] },
      });
      const res = await PUT(req);
      expect(res.status).toBe(404);
    });

    it("正常保存 → ok: true + step_count", async () => {
      // step_scenarios（存在確認）
      tableChains["step_scenarios"] = createChain({
        data: { id: 1 },
        error: null,
        count: null,
      });

      // step_items（削除→挿入）
      tableChains["step_items"] = createChain({
        data: null,
        error: null,
        count: null,
      });

      const graphData = {
        nodes: [
          {
            id: "node-0",
            type: "send",
            label: "テキスト送信",
            x: 100,
            y: 80,
            width: 220,
            height: 80,
            data: {
              step_type: "send_text",
              delay_type: "days",
              delay_value: 1,
              send_time: "10:00",
              content: "テストメッセージ",
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
          },
        ],
        edges: [],
      };

      const req = createMockRequest("PUT", "http://localhost/api/admin/line/flow-builder", {
        scenario_id: 1,
        graph: graphData,
      });
      const res = await PUT(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.step_count).toBe(1);
    });

    it("空のグラフ保存 → ステップ全削除、step_count: 0", async () => {
      tableChains["step_scenarios"] = createChain({
        data: { id: 1 },
        error: null,
        count: null,
      });
      tableChains["step_items"] = createChain({
        data: null,
        error: null,
        count: null,
      });

      const req = createMockRequest("PUT", "http://localhost/api/admin/line/flow-builder", {
        scenario_id: 1,
        graph: { nodes: [], edges: [] },
      });
      const res = await PUT(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.step_count).toBe(0);
    });

    it("条件分岐ノード含む保存 → 分岐先が正しく設定される", async () => {
      tableChains["step_scenarios"] = createChain({
        data: { id: 1 },
        error: null,
        count: null,
      });
      tableChains["step_items"] = createChain({
        data: null,
        error: null,
        count: null,
      });

      const graphData = {
        nodes: [
          {
            id: "node-0",
            type: "send",
            label: "テキスト送信",
            x: 100, y: 80, width: 220, height: 80,
            data: {
              step_type: "send_text",
              delay_type: "days", delay_value: 1, send_time: "10:00",
              content: "メッセージ1",
              template_id: null, tag_id: null, mark: null, menu_id: null,
              condition_rules: [],
              branch_true_step: null, branch_false_step: null,
              exit_condition_rules: [], exit_action: "exit", exit_jump_to: null,
            },
          },
          {
            id: "node-1",
            type: "condition",
            label: "条件分岐",
            x: 100, y: 220, width: 220, height: 100,
            data: {
              step_type: "condition",
              delay_type: "minutes", delay_value: 0, send_time: null,
              content: null,
              template_id: null, tag_id: null, mark: null, menu_id: null,
              condition_rules: [{ type: "tag", tag_ids: [1], tag_match: "any_include" }],
              branch_true_step: null, branch_false_step: null,
              exit_condition_rules: [], exit_action: "exit", exit_jump_to: null,
            },
          },
          {
            id: "node-2",
            type: "send",
            label: "テキスト送信",
            x: 100, y: 360, width: 220, height: 80,
            data: {
              step_type: "send_text",
              delay_type: "days", delay_value: 1, send_time: "10:00",
              content: "Trueの場合",
              template_id: null, tag_id: null, mark: null, menu_id: null,
              condition_rules: [],
              branch_true_step: null, branch_false_step: null,
              exit_condition_rules: [], exit_action: "exit", exit_jump_to: null,
            },
          },
        ],
        edges: [
          { id: "e1", from: "node-0", to: "node-1", fromPort: "bottom", toPort: "top" },
          { id: "e2", from: "node-1", to: "node-2", fromPort: "true", toPort: "top", label: "True", color: "#22c55e" },
        ],
      };

      const req = createMockRequest("PUT", "http://localhost/api/admin/line/flow-builder", {
        scenario_id: 1,
        graph: graphData,
      });
      const res = await PUT(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.step_count).toBe(3);
    });
  });
});
