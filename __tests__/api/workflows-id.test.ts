// __tests__/api/workflows-id.test.ts — ワークフロー個別操作API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モック ---
const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

const mockParseBody = vi.fn();
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: (...args: unknown[]) => mockParseBody(...args),
}));

vi.mock("@/lib/validations/line-common", () => ({
  updateWorkflowSchema: {},
}));

const mockExecuteWorkflow = vi.fn();
vi.mock("@/lib/workflow-engine", () => ({
  executeWorkflow: (...args: unknown[]) => mockExecuteWorkflow(...args),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(),
}));

vi.mock("@/lib/api-error", () => ({
  unauthorized: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  notFound: (msg: string) => new Response(JSON.stringify({ error: msg }), { status: 404 }),
  badRequest: (msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 }),
  serverError: (msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 }),
}));

// Supabase チェーンモック
type ChainResult = { data: unknown; error: unknown };
const resultMap = new Map<string, () => ChainResult>();

function createChain(getResult: () => ChainResult) {
  const chain: Record<string, unknown> = {};
  ["select", "eq", "neq", "is", "not", "order", "limit", "single",
   "insert", "update", "delete", "upsert"].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: (v: unknown) => void) => resolve(getResult());
  return chain;
}

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { GET, PUT, DELETE, POST } from "@/app/api/admin/line/workflows/[id]/route";

// RouteContext ヘルパー
function createCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createRequest(method: string, body?: Record<string, unknown>) {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest("http://localhost/api/admin/line/workflows/wf-1", init);
}

describe("ワークフロー個別操作API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    resultMap.clear();
  });

  // --- GET ---
  describe("GET", () => {
    it("認証なし → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const res = await GET(createRequest("GET"), createCtx("wf-1"));
      expect(res.status).toBe(401);
    });

    it("ワークフロー存在しない → 404", async () => {
      mockFrom.mockReturnValue(
        createChain(() => ({ data: null, error: { message: "not found" } })),
      );
      const res = await GET(createRequest("GET"), createCtx("wf-1"));
      expect(res.status).toBe(404);
    });

    it("正常にワークフロー詳細を返す", async () => {
      const workflow = { id: "wf-1", name: "テストWF", status: "draft" };
      const steps = [{ id: "s1", step_type: "send_message", sort_order: 0 }];
      const executions = [{ id: "e1", status: "completed" }];

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // workflows
          return createChain(() => ({ data: workflow, error: null }));
        } else if (callCount === 2) {
          // workflow_steps
          return createChain(() => ({ data: steps, error: null }));
        } else {
          // workflow_executions
          return createChain(() => ({ data: executions, error: null }));
        }
      });

      const res = await GET(createRequest("GET"), createCtx("wf-1"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.workflow.id).toBe("wf-1");
      expect(body.steps).toHaveLength(1);
      expect(body.executions).toHaveLength(1);
    });
  });

  // --- DELETE ---
  describe("DELETE", () => {
    it("認証なし → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const res = await DELETE(createRequest("DELETE"), createCtx("wf-1"));
      expect(res.status).toBe(401);
    });

    it("activeなワークフロー → 400（削除不可）", async () => {
      mockFrom.mockReturnValue(
        createChain(() => ({ data: { status: "active" }, error: null })),
      );
      const res = await DELETE(createRequest("DELETE"), createCtx("wf-1"));
      expect(res.status).toBe(400);
    });

    it("draft/paused → 正常削除", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // select status
          return createChain(() => ({ data: { status: "draft" }, error: null }));
        }
        // delete
        return createChain(() => ({ data: null, error: null }));
      });

      const res = await DELETE(createRequest("DELETE"), createCtx("wf-1"));
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });

  // --- POST（手動実行） ---
  describe("POST", () => {
    it("認証なし → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const res = await POST(createRequest("POST", {}), createCtx("wf-1"));
      expect(res.status).toBe(401);
    });

    it("executeWorkflow が呼ばれて結果を返す", async () => {
      mockExecuteWorkflow.mockResolvedValue({ executed: true, steps_completed: 3 });

      const req = createRequest("POST", {
        patient_id: "p1",
        line_user_id: "U123",
        patient_name: "テスト太郎",
      });
      const res = await POST(req, createCtx("wf-1"));
      const body = await res.json();

      expect(body.ok).toBe(true);
      expect(body.result.executed).toBe(true);
      expect(mockExecuteWorkflow).toHaveBeenCalledWith(
        "wf-1",
        { patient_id: "p1", line_user_id: "U123", patient_name: "テスト太郎" },
        "test-tenant",
      );
    });
  });
});
