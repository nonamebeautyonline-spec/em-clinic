import { describe, it, expect, vi, beforeEach } from "vitest";

// モック用の返却データ
let mockSettingsData: Record<string, unknown> | null = null;
let mockUpdatePayload: Record<string, unknown> | null = null;

// チェーン可能なモックビルダー
function createChainMock() {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockImplementation(() => chain);
  chain.eq = vi.fn().mockImplementation(() => chain);
  chain.is = vi.fn().mockImplementation(() => chain);
  chain.gte = vi.fn().mockImplementation(() => ({ data: null, error: null, count: 0 }));
  chain.maybeSingle = vi.fn().mockImplementation(() => ({ data: mockSettingsData, error: null }));
  chain.single = vi.fn().mockImplementation(() => ({ data: mockSettingsData, error: null }));
  chain.update = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
    mockUpdatePayload = payload;
    return chain;
  });
  chain.insert = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
    return {
      select: () => ({
        single: () => ({ data: { ...payload, id: 1 }, error: null }),
      }),
    };
  });
  chain.upsert = vi.fn().mockImplementation(() => ({ data: null, error: null }));
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (_table: string) => createChainMock(),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: (query: unknown) => query,
  strictWithTenant: (query: unknown) => query,
  tenantPayload: (tid: string | null) => ({ tenant_id: tid || null }),
  resolveTenantId: () => "00000000-0000-0000-0000-000000000001",
  resolveTenantIdOrThrow: () => "00000000-0000-0000-0000-000000000001",
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/business-hours", () => ({
  DEFAULT_BUSINESS_HOURS: { enabled: false, schedule: {}, timezone: "Asia/Tokyo", outside_message: "" },
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("mock-api-key"),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    set: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    sadd: vi.fn().mockResolvedValue(1),
    srem: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/ai-reply-approval", () => ({
  sendApprovalFlexMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "{}" }], usage: { input_tokens: 0, output_tokens: 0 } }) };
  },
}));

vi.mock("@/lib/embedding", () => ({
  saveAiReplyExample: vi.fn().mockResolvedValue(undefined),
  searchSimilarExamples: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/ai-reply-filter", () => ({
  shouldProcessWithAI: vi.fn().mockReturnValue({ process: true }),
}));

// Zodバリデーションのテスト
import { updateAiReplySettingsSchema, AI_REPLY_MODEL_IDS } from "@/lib/validations/line-management";

describe("AI返信設定 - model_id", () => {
  beforeEach(() => {
    mockSettingsData = null;
    mockUpdatePayload = null;
  });

  describe("Zodスキーマバリデーション", () => {
    it("有効なmodel_idを受け付ける", () => {
      for (const modelId of AI_REPLY_MODEL_IDS) {
        const result = updateAiReplySettingsSchema.safeParse({ model_id: modelId });
        expect(result.success).toBe(true);
      }
    });

    it("無効なmodel_idを拒否する", () => {
      const result = updateAiReplySettingsSchema.safeParse({ model_id: "gpt-4" });
      expect(result.success).toBe(false);
    });

    it("model_idはオプショナル", () => {
      const result = updateAiReplySettingsSchema.safeParse({ is_enabled: true });
      expect(result.success).toBe(true);
    });
  });

  describe("GET - model_idの返却", () => {
    it("設定が存在しない場合はデフォルトのmodel_idを返す", async () => {
      mockSettingsData = null;
      const { GET } = await import("@/app/api/admin/line/ai-reply-settings/route");
      const req = new Request("http://localhost/api/admin/line/ai-reply-settings");
      const res = await GET(req as any);
      const json = await res.json();
      expect(json.settings.model_id).toBe("claude-sonnet-4-6");
    });

    it("設定にmodel_idがある場合はその値を返す", async () => {
      mockSettingsData = {
        id: 1,
        is_enabled: true,
        mode: "approval",
        model_id: "claude-opus-4-6",
      };
      const { GET } = await import("@/app/api/admin/line/ai-reply-settings/route");
      const req = new Request("http://localhost/api/admin/line/ai-reply-settings");
      const res = await GET(req as any);
      const json = await res.json();
      expect(json.settings.model_id).toBe("claude-opus-4-6");
    });

    it("model_idがnullの既存レコードはデフォルト値を補完する", async () => {
      mockSettingsData = {
        id: 1,
        is_enabled: true,
        mode: "approval",
        model_id: null,
      };
      const { GET } = await import("@/app/api/admin/line/ai-reply-settings/route");
      const req = new Request("http://localhost/api/admin/line/ai-reply-settings");
      const res = await GET(req as any);
      const json = await res.json();
      expect(json.settings.model_id).toBe("claude-sonnet-4-6");
    });
  });

  describe("PUT - model_idの保存", () => {
    it("model_idを含むペイロードで更新できる", async () => {
      mockSettingsData = { id: 1 };
      const { PUT } = await import("@/app/api/admin/line/ai-reply-settings/route");
      const req = new Request("http://localhost/api/admin/line/ai-reply-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_enabled: true,
          model_id: "claude-haiku-4-5-20251001",
        }),
      });
      const res = await PUT(req as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(mockUpdatePayload?.model_id).toBe("claude-haiku-4-5-20251001");
    });

    it("model_id未指定時はデフォルト値で保存する", async () => {
      mockSettingsData = { id: 1 };
      const { PUT } = await import("@/app/api/admin/line/ai-reply-settings/route");
      const req = new Request("http://localhost/api/admin/line/ai-reply-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: true }),
      });
      const res = await PUT(req as any);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(mockUpdatePayload?.model_id).toBe("claude-sonnet-4-6");
    });

    it("無効なmodel_idは拒否される", async () => {
      const { PUT } = await import("@/app/api/admin/line/ai-reply-settings/route");
      const req = new Request("http://localhost/api/admin/line/ai-reply-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_enabled: true,
          model_id: "gpt-4-turbo",
        }),
      });
      const res = await PUT(req as any);
      expect(res.status).toBe(400);
    });
  });
});

describe("AI_REPLY_MODEL_IDS", () => {
  it("3つのモデルIDが定義されている", () => {
    expect(AI_REPLY_MODEL_IDS).toHaveLength(3);
    expect(AI_REPLY_MODEL_IDS).toContain("claude-sonnet-4-6");
    expect(AI_REPLY_MODEL_IDS).toContain("claude-haiku-4-5-20251001");
    expect(AI_REPLY_MODEL_IDS).toContain("claude-opus-4-6");
  });
});

describe("getAiReplyModel", () => {
  it("設定からモデルIDを取得する", async () => {
    mockSettingsData = { model_id: "claude-opus-4-6" };
    const { getAiReplyModel } = await import("@/lib/ai-reply");
    const model = await getAiReplyModel("tenant-1");
    expect(model).toBe("claude-opus-4-6");
  });

  it("設定がない場合はデフォルトを返す", async () => {
    mockSettingsData = null;
    const { getAiReplyModel } = await import("@/lib/ai-reply");
    const model = await getAiReplyModel(null);
    expect(model).toBe("claude-sonnet-4-6");
  });

  it("model_idがnullの場合はデフォルトを返す", async () => {
    mockSettingsData = { model_id: null };
    const { getAiReplyModel } = await import("@/lib/ai-reply");
    const model = await getAiReplyModel(null);
    expect(model).toBe("claude-sonnet-4-6");
  });
});
