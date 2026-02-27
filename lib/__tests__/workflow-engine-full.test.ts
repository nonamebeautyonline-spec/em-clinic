// lib/__tests__/workflow-engine-full.test.ts
// ワークフローエンジン executeWorkflow / fireWorkflowTrigger の統合テスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/line-richmenu", () => ({
  linkRichMenuToUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn((id) => ({ tenant_id: id })),
}));

vi.mock("@/lib/flex-sanitize", () => ({
  sanitizeFlexContents: vi.fn((c) => c),
}));

const { executeWorkflow, fireWorkflowTrigger } = await import(
  "@/lib/workflow-engine"
);

/* ---------- ヘルパー ---------- */

function createChain(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return chain;
}

const TENANT_ID = "test-tenant";
const WORKFLOW_ID = "wf-001";

const baseTriggerData = {
  patient_id: "p-001",
  line_user_id: "U1234",
  patient_name: "テスト太郎",
};

/* ---------- executeWorkflow ---------- */

describe("executeWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ワークフロー未存在→status: 'failed'", async () => {
    const workflowChain = createChain({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "not found" },
      }),
    });
    const stepsChain = createChain();
    const executionChain = createChain();

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "workflows":
          return workflowChain;
        case "workflow_steps":
          return stepsChain;
        case "workflow_executions":
          return executionChain;
        default:
          return createChain();
      }
    });

    const result = await executeWorkflow(WORKFLOW_ID, baseTriggerData, TENANT_ID);
    expect(result.status).toBe("failed");
    expect(result.execution_id).toBe("");
    expect(result.steps_executed).toBe(0);
  });

  it("ステップ0件→status: 'skipped'", async () => {
    const workflowChain = createChain({
      single: vi.fn().mockResolvedValue({
        data: { id: WORKFLOW_ID, status: "active" },
        error: null,
      }),
    });
    const stepsChain = createChain({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const executionChain = createChain();

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "workflows":
          return workflowChain;
        case "workflow_steps":
          return stepsChain;
        case "workflow_executions":
          return executionChain;
        default:
          return createChain();
      }
    });

    const result = await executeWorkflow(WORKFLOW_ID, baseTriggerData, TENANT_ID);
    expect(result.status).toBe("skipped");
    expect(result.steps_total).toBe(0);
  });

  it("実行ログ作成失敗→status: 'failed'", async () => {
    const workflowChain = createChain({
      single: vi.fn().mockResolvedValue({
        data: { id: WORKFLOW_ID, status: "active" },
        error: null,
      }),
    });

    // ステップ取得: 1件返す
    const stepsChain = createChain({
      order: vi.fn().mockResolvedValue({
        data: [
          { id: "s1", workflow_id: WORKFLOW_ID, sort_order: 1, step_type: "send_message", config: { message_type: "text", text: "hello" } },
        ],
        error: null,
      }),
    });

    // execution insert → エラー
    const executionChain = createChain({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "insert failed" },
          }),
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "workflows":
          return workflowChain;
        case "workflow_steps":
          return stepsChain;
        case "workflow_executions":
          return executionChain;
        default:
          return createChain();
      }
    });

    const result = await executeWorkflow(WORKFLOW_ID, baseTriggerData, TENANT_ID);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("実行ログの作成に失敗");
  });

  it("全ステップ正常実行→status: 'completed', steps_executed正確", async () => {
    const workflowChain = createChain({
      single: vi.fn().mockResolvedValue({
        data: { id: WORKFLOW_ID, status: "active" },
        error: null,
      }),
    });

    const stepsChain = createChain({
      order: vi.fn().mockResolvedValue({
        data: [
          { id: "s1", workflow_id: WORKFLOW_ID, sort_order: 1, step_type: "send_message", config: { message_type: "text", text: "hello" } },
          { id: "s2", workflow_id: WORKFLOW_ID, sort_order: 2, step_type: "send_message", config: { message_type: "text", text: "world" } },
        ],
        error: null,
      }),
    });

    const executionChain = createChain({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "exec-001" },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "workflows":
          return workflowChain;
        case "workflow_steps":
          return stepsChain;
        case "workflow_executions":
          return executionChain;
        default:
          return createChain();
      }
    });

    const result = await executeWorkflow(WORKFLOW_ID, baseTriggerData, TENANT_ID);
    expect(result.status).toBe("completed");
    expect(result.steps_executed).toBe(2);
    expect(result.steps_total).toBe(2);
  });

  it("waitステップで中断→status: 'waiting'", async () => {
    const workflowChain = createChain({
      single: vi.fn().mockResolvedValue({
        data: { id: WORKFLOW_ID, status: "active" },
        error: null,
      }),
    });

    const stepsChain = createChain({
      order: vi.fn().mockResolvedValue({
        data: [
          { id: "s1", workflow_id: WORKFLOW_ID, sort_order: 1, step_type: "send_message", config: { message_type: "text", text: "hello" } },
          { id: "s2", workflow_id: WORKFLOW_ID, sort_order: 2, step_type: "wait", config: { duration_minutes: 60 } },
          { id: "s3", workflow_id: WORKFLOW_ID, sort_order: 3, step_type: "send_message", config: { message_type: "text", text: "after wait" } },
        ],
        error: null,
      }),
    });

    const executionChain = createChain({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "exec-002" },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "workflows":
          return workflowChain;
        case "workflow_steps":
          return stepsChain;
        case "workflow_executions":
          return executionChain;
        default:
          return createChain();
      }
    });

    const result = await executeWorkflow(WORKFLOW_ID, baseTriggerData, TENANT_ID);
    expect(result.status).toBe("waiting");
    // waitの前にsend_messageが1つ実行される
    expect(result.steps_executed).toBe(1);
    expect(result.steps_total).toBe(3);
  });

  it("ステップエラーがあっても続行→最終status: 'failed'", async () => {
    const workflowChain = createChain({
      single: vi.fn().mockResolvedValue({
        data: { id: WORKFLOW_ID, status: "active" },
        error: null,
      }),
    });

    // send_message + add_tag（patient_idなしでエラー）
    const stepsChain = createChain({
      order: vi.fn().mockResolvedValue({
        data: [
          { id: "s1", workflow_id: WORKFLOW_ID, sort_order: 1, step_type: "add_tag", config: { tag_id: 1 } },
          { id: "s2", workflow_id: WORKFLOW_ID, sort_order: 2, step_type: "send_message", config: { message_type: "text", text: "hello" } },
        ],
        error: null,
      }),
    });

    const executionChain = createChain({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "exec-003" },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    // patient_idなしのtriggerDataでadd_tagはエラーになる
    const triggerNoPatient = { line_user_id: "U1234" };

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "workflows":
          return workflowChain;
        case "workflow_steps":
          return stepsChain;
        case "workflow_executions":
          return executionChain;
        default:
          return createChain();
      }
    });

    const result = await executeWorkflow(WORKFLOW_ID, triggerNoPatient, TENANT_ID);
    // add_tagはpatient_idなしでエラーだが、次のsend_messageは実行される
    expect(result.status).toBe("failed");
    expect(result.steps_executed).toBe(2);
    expect(result.error).toBeTruthy();
  });

  it("execution_idが返される", async () => {
    const workflowChain = createChain({
      single: vi.fn().mockResolvedValue({
        data: { id: WORKFLOW_ID, status: "active" },
        error: null,
      }),
    });

    const stepsChain = createChain({
      order: vi.fn().mockResolvedValue({
        data: [
          { id: "s1", workflow_id: WORKFLOW_ID, sort_order: 1, step_type: "send_message", config: { message_type: "text", text: "hello" } },
        ],
        error: null,
      }),
    });

    const executionChain = createChain({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "exec-id-abc" },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "workflows":
          return workflowChain;
        case "workflow_steps":
          return stepsChain;
        case "workflow_executions":
          return executionChain;
        default:
          return createChain();
      }
    });

    const result = await executeWorkflow(WORKFLOW_ID, baseTriggerData, TENANT_ID);
    expect(result.execution_id).toBe("exec-id-abc");
  });
});

/* ---------- fireWorkflowTrigger ---------- */

describe("fireWorkflowTrigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("アクティブワークフロー未存在→空配列", async () => {
    // workflows 検索で0件
    const workflowChain = createChain();
    // withTenantはquery自体を返すので、eq後の最終結果が { data: null } になるようにする
    // fireWorkflowTrigger は .select().eq().eq() のチェーンを使い、withTenantでラップ
    // withTenantモックはquery自体を返す → eqの最後の呼び出しの結果がPromiseで返る
    workflowChain.eq = vi.fn().mockReturnValue({
      ...workflowChain,
      eq: vi.fn().mockResolvedValue({ data: null }),
    });

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "workflows":
          return workflowChain;
        default:
          return createChain();
      }
    });

    const results = await fireWorkflowTrigger("tag_added", baseTriggerData, TENANT_ID);
    expect(results).toEqual([]);
  });

  it("triggerConfig null→全てマッチ", async () => {
    // workflows検索で1件返す（trigger_config: null）
    const workflowSearchChain = createChain();
    workflowSearchChain.eq = vi.fn().mockReturnValue({
      ...workflowSearchChain,
      eq: vi.fn().mockResolvedValue({
        data: [{ id: "wf-match", trigger_config: null }],
      }),
    });

    // executeWorkflow用: workflow取得 → 未存在（簡略化: failedが返る）
    const workflowGetChain = createChain({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "not found" },
      }),
    });

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "workflows") {
        callCount++;
        // 1回目: fireWorkflowTriggerの検索、2回目以降: executeWorkflowのワークフロー取得
        if (callCount === 1) return workflowSearchChain;
        return workflowGetChain;
      }
      return createChain();
    });

    const results = await fireWorkflowTrigger("manual", baseTriggerData, TENANT_ID);
    // triggerConfig null → マッチ → executeWorkflow呼出（失敗するがresultsには含まれる）
    expect(results.length).toBe(1);
  });

  it("tag_id一致→executeWorkflow呼出", async () => {
    const workflowSearchChain = createChain();
    workflowSearchChain.eq = vi.fn().mockReturnValue({
      ...workflowSearchChain,
      eq: vi.fn().mockResolvedValue({
        data: [{ id: "wf-tag", trigger_config: { tag_id: 42 } }],
      }),
    });

    const workflowGetChain = createChain({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "not found" },
      }),
    });

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "workflows") {
        callCount++;
        if (callCount === 1) return workflowSearchChain;
        return workflowGetChain;
      }
      return createChain();
    });

    const triggerData = { ...baseTriggerData, tag_id: 42 };
    const results = await fireWorkflowTrigger("tag_added", triggerData, TENANT_ID);
    // tag_id一致 → executeWorkflow呼出
    expect(results.length).toBe(1);
  });

  it("tag_id不一致→スキップ", async () => {
    const workflowSearchChain = createChain();
    workflowSearchChain.eq = vi.fn().mockReturnValue({
      ...workflowSearchChain,
      eq: vi.fn().mockResolvedValue({
        data: [{ id: "wf-tag", trigger_config: { tag_id: 42 } }],
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "workflows") return workflowSearchChain;
      return createChain();
    });

    const triggerData = { ...baseTriggerData, tag_id: 99 };
    const results = await fireWorkflowTrigger("tag_added", triggerData, TENANT_ID);
    // tag_id不一致 → スキップ → 空配列
    expect(results).toEqual([]);
  });

  it("複数ワークフロー→全て実行結果返却", async () => {
    const workflowSearchChain = createChain();
    workflowSearchChain.eq = vi.fn().mockReturnValue({
      ...workflowSearchChain,
      eq: vi.fn().mockResolvedValue({
        data: [
          { id: "wf-1", trigger_config: null },
          { id: "wf-2", trigger_config: null },
        ],
      }),
    });

    const workflowGetChain = createChain({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "not found" },
      }),
    });

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "workflows") {
        callCount++;
        if (callCount === 1) return workflowSearchChain;
        return workflowGetChain;
      }
      return createChain();
    });

    const results = await fireWorkflowTrigger("manual", baseTriggerData, TENANT_ID);
    expect(results.length).toBe(2);
  });
});
