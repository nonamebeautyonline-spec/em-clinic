// lib/__tests__/ai-reply-integration.test.ts
// Month 2-4 追加テスト: Safe Actions + ToolDefinitions拡張

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Safe Actions テスト
// ============================================================
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((r: (val: unknown) => unknown) => r({ data: null, error: null })),
    }),
  },
}));
vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({})),
}));
vi.mock("@/lib/line-push", () => ({ pushMessage: vi.fn() }));

import { SAFE_ACTIONS, type SafeActionType } from "@/lib/ai-safe-actions";

describe("Safe Actions", () => {
  it("2種のアクションが定義されている", () => {
    expect(Object.keys(SAFE_ACTIONS)).toHaveLength(2);
    expect(SAFE_ACTIONS.resend_payment_link).toBeDefined();
    expect(SAFE_ACTIONS.resend_questionnaire).toBeDefined();
  });

  it("各アクションにlabelとdescriptionがある", () => {
    for (const action of Object.values(SAFE_ACTIONS)) {
      expect(action.label).toBeTruthy();
      expect(action.description).toBeTruthy();
    }
  });

  it("resend_payment_link のlabelが正しい", () => {
    expect(SAFE_ACTIONS.resend_payment_link.label).toBe("支払リンク再送");
  });

  it("resend_questionnaire のlabelが正しい", () => {
    expect(SAFE_ACTIONS.resend_questionnaire.label).toBe("問診再送");
  });
});

// ============================================================
// ai-reply-tools.ts write系ツール定義テスト
// ============================================================
vi.mock("@/lib/ai-safe-actions", () => ({
  SAFE_ACTIONS: {
    resend_payment_link: { label: "支払リンク再送", description: "test" },
    resend_questionnaire: { label: "問診再送", description: "test" },
  },
  proposeAction: vi.fn(),
}));

import { getToolDefinitions, executeTool } from "@/lib/ai-reply-tools";

describe("ai-reply-tools write系ツール", () => {
  it("getToolDefinitionsに6種のツールが含まれる（read 4 + write 2）", () => {
    const tools = getToolDefinitions();
    expect(tools.length).toBe(6);
    const names = tools.map(t => t.name);
    // read系
    expect(names).toContain("check_reservation");
    expect(names).toContain("check_order_status");
    expect(names).toContain("check_payment_status");
    expect(names).toContain("check_questionnaire_status");
    // write系
    expect(names).toContain("resend_payment_link");
    expect(names).toContain("resend_questionnaire");
  });

  it("write系ツール定義にdescriptionが含まれる", () => {
    const tools = getToolDefinitions();
    const writeTools = tools.filter(t => ["resend_payment_link", "resend_questionnaire"].includes(t.name));
    for (const tool of writeTools) {
      expect(tool.description).toBeTruthy();
      expect(tool.description).toContain("承認");
    }
  });

  it("resend_payment_link実行 → 提案メッセージを返す（直接実行しない）", async () => {
    const result = await executeTool("resend_payment_link", { patient_id: "p1" }, null);
    expect(result.content).toContain("支払リンク再送");
    expect(result.content).toContain("承認");
    expect(result.is_error).toBeFalsy();
  });

  it("resend_questionnaire実行 → 提案メッセージを返す（直接実行しない）", async () => {
    const result = await executeTool("resend_questionnaire", { patient_id: "p1" }, null);
    expect(result.content).toContain("問診再送");
    expect(result.content).toContain("承認");
    expect(result.is_error).toBeFalsy();
  });
});

// ============================================================
// ai-model-routing 補完テスト
// ============================================================
import { resolveModelByRouting, HAIKU_MODEL_ID, ROUTING_REASONS, ROUTING_REASON_LABELS } from "@/lib/ai-model-routing";

describe("Case Routing 補完テスト", () => {
  it("全routingReasonにラベルが存在する", () => {
    for (const reason of Object.values(ROUTING_REASONS)) {
      expect(ROUTING_REASON_LABELS[reason]).toBeTruthy();
    }
  });

  it("HAIKU_MODEL_ID定数が正しい", () => {
    expect(HAIKU_MODEL_ID).toBe("claude-haiku-4-5-20251001");
  });

  it("null classificationResult + routing有効 → Sonnetフォールバック", () => {
    const result = resolveModelByRouting(null, "claude-sonnet-4-6", true);
    expect(result.modelId).toBe("claude-sonnet-4-6");
    expect(result.routingReason).toBe("classification_failed");
  });
});

// ============================================================
// Escalation type定義テスト
// ============================================================
import type { EscalationDetail } from "@/lib/ai-escalation";

describe("EscalationDetail 型定義", () => {
  it("正しい型構造を持つ", () => {
    const detail: EscalationDetail = {
      urgency: "high",
      summary: "テスト",
      missing_info: ["情報1"],
      suggested_next_action: "アクション",
      escalation_team: "CS",
    };
    expect(detail.urgency).toBe("high");
    expect(detail.escalation_team).toBe("CS");
    expect(detail.missing_info).toHaveLength(1);
  });

  it("urgencyの3値が有効", () => {
    const values: EscalationDetail["urgency"][] = ["high", "medium", "low"];
    expect(values).toHaveLength(3);
  });

  it("escalation_teamの3値が有効", () => {
    const values: EscalationDetail["escalation_team"][] = ["CS", "医療", "請求"];
    expect(values).toHaveLength(3);
  });
});
