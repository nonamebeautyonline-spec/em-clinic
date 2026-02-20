import { describe, it, expect, vi, beforeEach } from "vitest";

// モック
const mockSupabaseFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      mockSupabaseFrom(table);
      return {
        select: (...args: any[]) => { mockSelect(...args); return { maybeSingle: () => { mockMaybeSingle(); return { data: null, error: null }; }, eq: mockEq, in: mockIn, order: mockOrder, single: () => { mockSingle(); return { data: null, error: null }; } }; },
        insert: (...args: any[]) => { mockInsert(...args); return { select: () => ({ single: () => ({ data: { id: 1 }, error: null }) }) }; },
        update: (...args: any[]) => { mockUpdate(...args); return { eq: () => ({ data: null, error: null }) }; },
      };
    },
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: (query: any) => query,
  tenantPayload: (tid: string | null) => ({ tenant_id: tid || null }),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("mock-api-key"),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: '{"category":"operational","confidence":0.9,"reply":"ご予約はLINEメニューから承ります。","reason":"予約方法の質問"}' }],
        usage: { input_tokens: 500, output_tokens: 100 },
      }),
    };
  },
}));

vi.mock("@/lib/ai-reply-approval", () => ({
  sendApprovalFlexMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    set: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
  },
}));

// テスト対象
import { shouldProcessWithAI } from "@/lib/ai-reply-filter";

describe("AI返信フィルタリング", () => {
  const defaultSettings = { min_message_length: 5 };

  it("テキスト以外はスキップ", () => {
    const result = shouldProcessWithAI("hello", "image", defaultSettings);
    expect(result.process).toBe(false);
    expect(result.reason).toBe("not_text");
  });

  it("短いメッセージはスキップ", () => {
    const result = shouldProcessWithAI("はい", "text", defaultSettings);
    expect(result.process).toBe(false);
    expect(result.reason).toBe("too_short");
  });

  it("応答不要パターンはスキップ", () => {
    const skipWords = ["はい", "いいえ", "了解", "ありがとう", "OK", "分かりました", "わかりました", "お願いします"];
    for (const word of skipWords) {
      // min_message_length を1にしてパターンマッチを検証
      const result = shouldProcessWithAI(word, "text", { min_message_length: 1 });
      expect(result.process).toBe(false);
      expect(result.reason).toBe("skip_pattern");
    }
  });

  it("数字のみはスキップ", () => {
    const result = shouldProcessWithAI("12345", "text", defaultSettings);
    expect(result.process).toBe(false);
    expect(result.reason).toBe("skip_pattern");
  });

  it("通常のメッセージは処理対象", () => {
    const result = shouldProcessWithAI("予約の方法を教えてください", "text", defaultSettings);
    expect(result.process).toBe(true);
  });

  it("医学的な質問も処理対象（フィルタはカテゴリ判定しない）", () => {
    const result = shouldProcessWithAI("薬の副作用が心配です", "text", defaultSettings);
    expect(result.process).toBe(true);
  });

  it("min_message_length設定が反映される", () => {
    const result = shouldProcessWithAI("こんにちは", "text", { min_message_length: 10 });
    expect(result.process).toBe(false);
    expect(result.reason).toBe("too_short");
  });
});

describe("AI返信設定API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GETのバリデーション: 未認証は401", async () => {
    vi.doMock("@/lib/admin-auth", () => ({
      verifyAdminAuth: vi.fn().mockResolvedValue(false),
    }));

    const mod = await import("@/app/api/admin/line/ai-reply-settings/route");
    const req = new Request("http://localhost/api/admin/line/ai-reply-settings", {
      method: "GET",
      headers: new Headers(),
    }) as any;
    const res = await mod.GET(req);
    expect(res.status).toBe(401);
  });
});

describe("承認Flex Message", () => {
  it("sendApprovalFlexMessage がインポート可能", async () => {
    const mod = await import("@/lib/ai-reply-approval");
    expect(typeof mod.sendApprovalFlexMessage).toBe("function");
  });
});

describe("AI返信メイン処理", () => {
  it("scheduleAiReply / sendAiReply がインポート可能", async () => {
    const mod = await import("@/lib/ai-reply");
    expect(typeof mod.scheduleAiReply).toBe("function");
    expect(typeof mod.sendAiReply).toBe("function");
  });
});
