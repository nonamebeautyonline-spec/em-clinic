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

describe("buildSystemPrompt 却下フィードバック", () => {
  it("却下パターンなしでも正常に動作（後方互換性）", async () => {
    const { buildSystemPrompt } = await import("@/lib/ai-reply");
    const prompt = buildSystemPrompt("テスト知識", "テスト指示");
    expect(prompt).toContain("テスト知識");
    expect(prompt).toContain("テスト指示");
    expect(prompt).not.toContain("過去の却下された返信例");
  });

  it("空配列でも却下セクションは追加されない", async () => {
    const { buildSystemPrompt } = await import("@/lib/ai-reply");
    const prompt = buildSystemPrompt("知識", "指示", []);
    expect(prompt).not.toContain("過去の却下された返信例");
  });

  it("却下パターンがある場合、プロンプト末尾に追加される", async () => {
    const { buildSystemPrompt } = await import("@/lib/ai-reply");
    const prompt = buildSystemPrompt("知識", "指示", [
      {
        original_message: "予約したい",
        draft_reply: "ご予約は電話で承ります",
        reject_category: "inaccurate",
        reject_reason: "LINEから予約できるのが正しい",
      },
      {
        original_message: "薬の副作用は？",
        draft_reply: "副作用はありません",
        reject_category: "inappropriate",
        reject_reason: null,
      },
    ]);
    expect(prompt).toContain("過去の却下された返信例");
    expect(prompt).toContain("予約したい");
    expect(prompt).toContain("不正確");
    expect(prompt).toContain("LINEから予約できるのが正しい");
    expect(prompt).toContain("不適切な表現");
  });

  it("reject_categoryがnullの場合は「理由なし」と表示される", async () => {
    const { buildSystemPrompt } = await import("@/lib/ai-reply");
    const prompt = buildSystemPrompt("知識", "指示", [
      {
        original_message: "テスト",
        draft_reply: "テスト返信",
        reject_category: null,
        reject_reason: null,
      },
    ]);
    expect(prompt).toContain("理由なし");
  });

  it("全カテゴリの日本語ラベルが正しい", async () => {
    const { rejectCategoryLabels } = await import("@/lib/validations/ai-reply");
    expect(rejectCategoryLabels.inaccurate).toBe("不正確");
    expect(rejectCategoryLabels.inappropriate).toBe("不適切な表現");
    expect(rejectCategoryLabels.not_answering).toBe("質問に答えていない");
    expect(rejectCategoryLabels.insufficient_info).toBe("情報不足");
    expect(rejectCategoryLabels.other).toBe("その他");
  });
});
