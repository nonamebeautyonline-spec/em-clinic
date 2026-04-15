// lib/__tests__/ai-reply-tools.test.ts — AI返信ツールのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["select", "insert", "update", "delete", "eq", "neq", "is", "not",
   "order", "limit", "single", "maybeSingle"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn((tid: string | null) => ({ tenant_id: tid })),
}));

vi.mock("@/lib/ai-safe-actions", () => ({
  proposeAction: vi.fn().mockResolvedValue({ id: 1 }),
}));

import { getToolDefinitions, executeTool } from "../ai-reply-tools";

describe("getToolDefinitions", () => {
  it("6つのツール定義を返す", () => {
    const tools = getToolDefinitions();
    expect(tools).toHaveLength(6);
  });

  it("各ツールにnameとdescriptionがある", () => {
    const tools = getToolDefinitions();
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.input_schema).toBeDefined();
    }
  });

  it("read系ツール4種+write系ツール2種が含まれる", () => {
    const tools = getToolDefinitions();
    const names = tools.map(t => t.name);
    expect(names).toContain("check_reservation");
    expect(names).toContain("check_order_status");
    expect(names).toContain("check_payment_status");
    expect(names).toContain("check_questionnaire_status");
    expect(names).toContain("resend_payment_link");
    expect(names).toContain("resend_questionnaire");
  });
});

describe("executeTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- check_reservation ---
  it("check_reservation: 予約情報がある場合に予約状況を返す", async () => {
    mockFrom.mockReturnValue(createChain({
      data: [{ reserve_id: "R001", reserve_date: "2026-04-20", reserve_time: "14:00", status: "OK" }],
      error: null,
    }));

    const result = await executeTool("check_reservation", { patient_id: "P001" }, "t1");
    expect(result.content).toContain("予約日: 2026-04-20");
    expect(result.content).toContain("14:00");
    expect(result.is_error).toBeUndefined();
  });

  it("check_reservation: 予約情報がない場合", async () => {
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));

    const result = await executeTool("check_reservation", { patient_id: "P001" }, "t1");
    expect(result.content).toContain("見つかりません");
  });

  // --- check_order_status ---
  it("check_order_status: 注文情報がある場合", async () => {
    mockFrom.mockReturnValue(createChain({
      data: [{
        id: 1,
        payment_status: "paid",
        shipping_status: "shipped",
        payment_method: "credit_card",
        total_amount: 5000,
        created_at: "2026-04-10",
        shipped_at: "2026-04-12T10:00:00Z",
        tracking_number: "TRACK123",
      }],
      error: null,
    }));

    const result = await executeTool("check_order_status", { patient_id: "P001" }, "t1");
    expect(result.content).toContain("決済済み");
    expect(result.content).toContain("発送済み");
    expect(result.content).toContain("5000円");
    expect(result.content).toContain("TRACK123");
  });

  it("check_order_status: 注文がない場合", async () => {
    mockFrom.mockReturnValue(createChain({ data: [], error: null }));

    const result = await executeTool("check_order_status", { patient_id: "P001" }, "t1");
    expect(result.content).toContain("見つかりません");
  });

  // --- check_payment_status ---
  it("check_payment_status: 決済済み", async () => {
    mockFrom.mockReturnValue(createChain({
      data: [{
        payment_status: "paid",
        payment_method: "credit_card",
        total_amount: 3000,
        paid_at: "2026-04-10T10:00:00Z",
      }],
      error: null,
    }));

    const result = await executeTool("check_payment_status", { patient_id: "P001" }, "t1");
    expect(result.content).toContain("決済済み");
    expect(result.content).toContain("クレジットカード");
    expect(result.content).toContain("3000円");
  });

  it("check_payment_status: 未決済", async () => {
    mockFrom.mockReturnValue(createChain({
      data: [{
        payment_status: "pending",
        payment_method: "bank_transfer",
        total_amount: 2000,
        paid_at: null,
      }],
      error: null,
    }));

    const result = await executeTool("check_payment_status", { patient_id: "P001" }, "t1");
    expect(result.content).toContain("未決済");
    expect(result.content).toContain("銀行振込");
  });

  // --- check_questionnaire_status ---
  it("check_questionnaire_status: 回答済み", async () => {
    mockFrom.mockReturnValue(createChain({
      data: [{
        status: "completed",
        answers: { q1: "answer1" },
        questionnaire_completed_at: "2026-04-10T10:00:00Z",
      }],
      error: null,
    }));

    const result = await executeTool("check_questionnaire_status", { patient_id: "P001" }, "t1");
    expect(result.content).toContain("回答済み");
  });

  it("check_questionnaire_status: 未回答", async () => {
    mockFrom.mockReturnValue(createChain({
      data: [{
        status: "pending",
        answers: {},
        questionnaire_completed_at: null,
      }],
      error: null,
    }));

    const result = await executeTool("check_questionnaire_status", { patient_id: "P001" }, "t1");
    expect(result.content).toContain("未回答");
  });

  // --- write系ツール ---
  it("resend_payment_link: 提案メッセージを返す", async () => {
    const result = await executeTool("resend_payment_link", { patient_id: "P001" }, "t1");
    expect(result.content).toContain("支払リンク再送");
    expect(result.content).toContain("承認後");
  });

  it("resend_questionnaire: 提案メッセージを返す", async () => {
    const result = await executeTool("resend_questionnaire", { patient_id: "P001" }, "t1");
    expect(result.content).toContain("問診再送");
  });

  // --- 不明ツール ---
  it("不明なツールの場合はエラーを返す", async () => {
    const result = await executeTool("unknown_tool", { patient_id: "P001" }, "t1");
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("不明なツール");
  });

  // --- エラーハンドリング ---
  it("DB例外時はエラーメッセージを返す", async () => {
    mockFrom.mockImplementation(() => { throw new Error("DB connection failed"); });

    const result = await executeTool("check_reservation", { patient_id: "P001" }, "t1");
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("エラーが発生しました");
  });
});
