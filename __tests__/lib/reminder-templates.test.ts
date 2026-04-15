// __tests__/lib/reminder-templates.test.ts
// リマインダーテンプレート ライブラリテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

function createChain(resolvedValue: unknown = { data: [], error: null }) {
  const handler: ProxyHandler<object> = {
    get: (_target, prop) => {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(resolvedValue);
      }
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => createChain()),
    rpc: vi.fn(() => createChain()),
  },
}));

vi.mock("@/lib/tenant", () => ({
  strictWithTenant: vi.fn((q) => q),
  tenantPayload: vi.fn((tid: string) => ({ tenant_id: tid })),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn(),
}));

vi.mock("@/lib/template-variables", () => ({
  expandTemplate: vi.fn((text: string) => Promise.resolve(text)),
}));

describe("reminder-templates", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("getReminderTemplates がテンプレート一覧を返す", async () => {
    const { getReminderTemplates } = await import("@/lib/reminder-templates");
    const result = await getReminderTemplates("test-tenant");
    expect(Array.isArray(result)).toBe(true);
  });

  it("createReminderTemplate が新規テンプレートを作成", async () => {
    // エラーなしの場合は data を返す
    const { supabaseAdmin } = await import("@/lib/supabase");
    const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
    mockFrom.mockReturnValue(
      createChain({ data: { id: "t1", name: "テスト", is_active: true, tenant_id: "test-tenant", created_at: "" }, error: null })
    );

    const { createReminderTemplate } = await import("@/lib/reminder-templates");
    const result = await createReminderTemplate({ name: "テスト" }, "test-tenant");
    expect(result).toHaveProperty("id");
  });

  it("getReminderSteps がステップ一覧を返す", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
    mockFrom.mockReturnValue(
      createChain({ data: [], error: null })
    );
    const { getReminderSteps } = await import("@/lib/reminder-templates");
    const result = await getReminderSteps("template-1");
    expect(Array.isArray(result)).toBe(true);
  });

  it("enrollPatientReminder が正常に登録", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
    mockFrom.mockReturnValue(
      createChain({ data: { id: "r1", patient_id: "p1", template_id: "t1", target_date: "2026-04-15", status: "active", tenant_id: "test-tenant" }, error: null })
    );

    const { enrollPatientReminder } = await import("@/lib/reminder-templates");
    const result = await enrollPatientReminder(
      { patientId: "p1", templateId: "t1", targetDate: "2026-04-15" },
      "test-tenant"
    );
    expect(result).toHaveProperty("id");
  });

  it("processReminderDeliveries がリマインダー0件で0を返す", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
    mockFrom.mockReturnValue(
      createChain({ data: [], error: null })
    );
    const { processReminderDeliveries } = await import("@/lib/reminder-templates");
    const result = await processReminderDeliveries("test-tenant");
    expect(result).toBe(0);
  });
});
