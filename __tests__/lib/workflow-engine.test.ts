// __tests__/lib/workflow-engine.test.ts
// ワークフローエンジンのステップ実行ロジックテスト
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// --- vi.hoisted でモック関数を先に作成（vi.mockファクトリ内で参照可能にする） ---
const {
  mockFrom,
  mockSelect,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockUpsert,
  mockEq,
  mockOrder,
  mockLimit,
  mockSingle,
  mockMaybeSingle,
} = vi.hoisted(() => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockUpsert = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    upsert: mockUpsert,
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  }));

  return {
    mockFrom,
    mockSelect,
    mockInsert,
    mockUpdate,
    mockDelete,
    mockUpsert,
    mockEq,
    mockOrder,
    mockLimit,
    mockSingle,
    mockMaybeSingle,
  };
});

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mockFrom },
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/line-richmenu", () => ({
  linkRichMenuToUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tenantId: string | null) => ({ tenant_id: tenantId })),
}));

vi.mock("@/lib/flex-sanitize", () => ({
  sanitizeFlexContents: vi.fn((content: any) => content),
}));

// executeStep を直接テストするため import
import { executeStep } from "@/lib/workflow-engine";
import type { TriggerData } from "@/lib/workflow-engine";

beforeEach(() => {
  vi.clearAllMocks();
  // チェーンを再構築
  mockSelect.mockReturnThis();
  mockInsert.mockReturnThis();
  mockUpdate.mockReturnThis();
  mockDelete.mockReturnThis();
  mockUpsert.mockReturnThis();
  mockEq.mockReturnThis();
  mockOrder.mockReturnThis();
  mockLimit.mockReturnThis();
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
});

/* ======== send_message ステップ ======== */
describe("executeStep: send_message", () => {
  const triggerData: TriggerData = {
    patient_id: "p-001",
    line_user_id: "U_test123",
    patient_name: "テスト太郎",
  };

  it("テキスト送信: LINE IDがなければエラー", async () => {
    const step = {
      id: "step-1",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "send_message" as const,
      config: { message_type: "text", text: "こんにちは" },
    };
    const result = await executeStep(step, { patient_id: "p-001" }, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("LINE ID");
  });

  it("テキスト送信: 正常実行", async () => {
    const step = {
      id: "step-1",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "send_message" as const,
      config: { message_type: "text", text: "こんにちは{name}さん" },
    };
    const result = await executeStep(step, triggerData, null);
    expect(result.success).toBe(true);
    expect(result.detail).toContain("メッセージ送信完了");
  });

  it("テンプレート送信: テンプレートが見つからなければエラー", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const step = {
      id: "step-2",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "send_message" as const,
      config: { message_type: "template", template_id: 999 },
    };
    const result = await executeStep(step, triggerData, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("テンプレートID=999");
  });

  it("テキストもテンプレートもなければエラー", async () => {
    const step = {
      id: "step-3",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "send_message" as const,
      config: { message_type: "text" },
    };
    const result = await executeStep(step, triggerData, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("メッセージの内容が設定されていません");
  });
});

/* ======== add_tag ステップ ======== */
describe("executeStep: add_tag", () => {
  it("患者IDがなければエラー", async () => {
    const step = {
      id: "step-1",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "add_tag" as const,
      config: { tag_id: 5 },
    };
    const result = await executeStep(step, { line_user_id: "U_test" }, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("患者ID");
  });

  it("タグIDがなければエラー", async () => {
    const step = {
      id: "step-2",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "add_tag" as const,
      config: {},
    };
    const result = await executeStep(step, { patient_id: "p-001" }, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("タグID");
  });

  it("正常実行", async () => {
    const step = {
      id: "step-3",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "add_tag" as const,
      config: { tag_id: 5, tag_name: "VIP" },
    };
    const result = await executeStep(step, { patient_id: "p-001" }, null);
    expect(result.success).toBe(true);
    expect(result.detail).toContain("タグ追加");
  });
});

/* ======== remove_tag ステップ ======== */
describe("executeStep: remove_tag", () => {
  it("患者IDがなければエラー", async () => {
    const step = {
      id: "step-1",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "remove_tag" as const,
      config: { tag_id: 5 },
    };
    const result = await executeStep(step, { line_user_id: "U_test" }, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("患者ID");
  });

  it("正常実行", async () => {
    const step = {
      id: "step-2",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "remove_tag" as const,
      config: { tag_id: 5 },
    };
    const result = await executeStep(step, { patient_id: "p-001" }, null);
    expect(result.success).toBe(true);
    expect(result.detail).toContain("タグ削除");
  });
});

/* ======== switch_richmenu ステップ ======== */
describe("executeStep: switch_richmenu", () => {
  it("LINE IDがなければエラー", async () => {
    const step = {
      id: "step-1",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "switch_richmenu" as const,
      config: { menu_id: 1 },
    };
    const result = await executeStep(step, { patient_id: "p-001" }, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("LINE ID");
  });

  it("メニューIDがなければエラー", async () => {
    const step = {
      id: "step-2",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "switch_richmenu" as const,
      config: {},
    };
    const result = await executeStep(step, { line_user_id: "U_test" }, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("メニューID");
  });

  it("リッチメニューが見つからなければエラー", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const step = {
      id: "step-3",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "switch_richmenu" as const,
      config: { menu_id: 99 },
    };
    const result = await executeStep(step, { line_user_id: "U_test" }, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("リッチメニューID=99");
  });
});

/* ======== wait ステップ ======== */
describe("executeStep: wait", () => {
  it("waitステップはwaiting=trueを返す", async () => {
    const step = {
      id: "step-1",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "wait" as const,
      config: { duration_minutes: 60 },
    };
    const result = await executeStep(step, {}, null);
    expect(result.success).toBe(true);
    expect(result.waiting).toBe(true);
    expect(result.detail).toContain("60分待機");
  });
});

/* ======== condition ステップ ======== */
describe("executeStep: condition", () => {
  it("患者IDがなければエラー", async () => {
    const step = {
      id: "step-1",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "condition" as const,
      config: { condition_type: "has_tag", tag_id: 5 },
    };
    const result = await executeStep(step, { line_user_id: "U_test" }, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("患者ID");
  });

  it("has_tag: タグIDが未設定ならエラー", async () => {
    const step = {
      id: "step-2",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "condition" as const,
      config: { condition_type: "has_tag" },
    };
    const result = await executeStep(step, { patient_id: "p-001" }, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("タグIDが未設定");
  });

  it("has_tag: タグがなければスキップ", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const step = {
      id: "step-3",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "condition" as const,
      config: { condition_type: "has_tag", tag_id: 5 },
    };
    const result = await executeStep(step, { patient_id: "p-001" }, null);
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it("has_tag: タグがあれば通過", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null });
    const step = {
      id: "step-4",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "condition" as const,
      config: { condition_type: "has_tag", tag_id: 5 },
    };
    const result = await executeStep(step, { patient_id: "p-001" }, null);
    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(result.detail).toContain("条件一致");
  });

  it("custom_field: eqオペレータ", async () => {
    const step = {
      id: "step-5",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "condition" as const,
      config: { condition_type: "custom_field", field_name: "sex", field_value: "male", operator: "eq" },
    };
    const result = await executeStep(step, { patient_id: "p-001", sex: "male" }, null);
    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
  });

  it("custom_field: neqオペレータ", async () => {
    const step = {
      id: "step-6",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "condition" as const,
      config: { condition_type: "custom_field", field_name: "sex", field_value: "male", operator: "neq" },
    };
    const result = await executeStep(step, { patient_id: "p-001", sex: "female" }, null);
    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
  });

  it("custom_field: containsオペレータ", async () => {
    const step = {
      id: "step-7",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "condition" as const,
      config: { condition_type: "custom_field", field_name: "memo", field_value: "VIP", operator: "contains" },
    };
    const result = await executeStep(step, { patient_id: "p-001", memo: "VIP会員" }, null);
    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
  });

  it("custom_field: gtオペレータ", async () => {
    const step = {
      id: "step-8",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "condition" as const,
      config: { condition_type: "custom_field", field_name: "visit_count", field_value: "3", operator: "gt" },
    };
    const result = await executeStep(step, { patient_id: "p-001", visit_count: 5 }, null);
    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
  });

  it("custom_field: ltオペレータ（条件不一致でスキップ）", async () => {
    const step = {
      id: "step-9",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "condition" as const,
      config: { condition_type: "custom_field", field_name: "visit_count", field_value: "3", operator: "lt" },
    };
    const result = await executeStep(step, { patient_id: "p-001", visit_count: 5 }, null);
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it("不明な条件タイプはエラー", async () => {
    const step = {
      id: "step-10",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "condition" as const,
      config: { condition_type: "unknown_type" },
    };
    const result = await executeStep(step, { patient_id: "p-001" }, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("不明な条件タイプ");
  });
});

/* ======== webhook ステップ ======== */
describe("executeStep: webhook", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("URLがなければエラー", async () => {
    const step = {
      id: "step-1",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "webhook" as const,
      config: {},
    };
    const result = await executeStep(step, {}, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Webhook URLが設定されていません");
  });

  it("正常実行", async () => {
    const step = {
      id: "step-2",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "webhook" as const,
      config: { url: "https://example.com/hook" },
    };
    const result = await executeStep(step, { patient_id: "p-001" }, null);
    expect(result.success).toBe(true);
    expect(result.detail).toContain("Webhook送信完了");
  });

  it("Webhook応答エラー", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Internal Server Error" });
    const step = {
      id: "step-3",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "webhook" as const,
      config: { url: "https://example.com/hook" },
    };
    const result = await executeStep(step, {}, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Webhook応答エラー");
  });

  it("ネットワークエラー", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const step = {
      id: "step-4",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "webhook" as const,
      config: { url: "https://example.com/hook" },
    };
    const result = await executeStep(step, {}, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Webhook送信失敗");
  });
});

/* ======== 不明ステップタイプ ======== */
describe("executeStep: 不明なステップタイプ", () => {
  it("不明なタイプはエラーを返す", async () => {
    const step = {
      id: "step-1",
      workflow_id: "wf-1",
      sort_order: 0,
      step_type: "unknown_type" as any,
      config: {},
    };
    const result = await executeStep(step, {}, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("不明なステップタイプ");
  });
});

/* ======== 変数置換テスト ======== */
describe("変数置換ロジック", () => {
  function replaceVariables(text: string, triggerData: TriggerData): string {
    return text
      .replace(/\{name\}/g, triggerData.patient_name || "")
      .replace(/\{patient_id\}/g, triggerData.patient_id || "");
  }

  it("{name}が患者名に置換される", () => {
    const result = replaceVariables("こんにちは{name}さん", {
      patient_name: "田中",
      patient_id: "p-001",
    });
    expect(result).toBe("こんにちは田中さん");
  });

  it("{patient_id}が患者IDに置換される", () => {
    const result = replaceVariables("ID: {patient_id}", {
      patient_name: "田中",
      patient_id: "p-001",
    });
    expect(result).toBe("ID: p-001");
  });

  it("複数の変数が同時に置換される", () => {
    const result = replaceVariables("{name}様 (ID: {patient_id})", {
      patient_name: "山田",
      patient_id: "p-002",
    });
    expect(result).toBe("山田様 (ID: p-002)");
  });

  it("変数がなければ空文字に置換", () => {
    const result = replaceVariables("こんにちは{name}さん", {});
    expect(result).toBe("こんにちはさん");
  });
});
