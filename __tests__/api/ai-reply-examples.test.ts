import { describe, it, expect, vi, beforeEach } from "vitest";

// モック
const mockSupabaseFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      mockSupabaseFrom(table);
      return {
        select: (...args: unknown[]) => {
          mockSelect(...args);
          return {
            order: () => ({
              limit: () => ({ data: [], error: null, count: 0 }),
            }),
            eq: () => ({ data: null, error: null }),
          };
        },
        insert: (...args: unknown[]) => {
          mockInsert(...args);
          return { error: null };
        },
        delete: () => {
          mockDelete();
          return { eq: () => ({ data: null, error: null }) };
        },
      };
    },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: (query: unknown) => query,
  strictWithTenant: (query: unknown) => query,
  tenantPayload: (tid: string | null) => ({ tenant_id: tid || null }),
  resolveTenantId: () => "00000000-0000-0000-0000-000000000001",
  resolveTenantIdOrThrow: () => "00000000-0000-0000-0000-000000000001",
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("mock-openai-key"),
}));

vi.mock("openai", () => ({
  default: class {
    embeddings = {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    };
  },
}));

import {
  generateEmbedding,
  saveAiReplyExample,
  searchSimilarExamples,
} from "@/lib/embedding";
import { buildSystemPrompt } from "@/lib/ai-reply";

describe("embedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateEmbedding", () => {
    it("テキストからembeddingベクトルを生成する", async () => {
      const result = await generateEmbedding("予約キャンセルしたい");
      expect(result).toHaveLength(1536);
      expect(result![0]).toBe(0.1);
    });
  });

  describe("saveAiReplyExample", () => {
    it("学習例をDBに保存する", async () => {
      const result = await saveAiReplyExample({
        tenantId: "00000000-0000-0000-0000-000000000001",
        question: "予約キャンセルしたい",
        answer: "承知しました。予約をキャンセルいたします。",
        source: "manual_reply",
      });
      expect(result).toBe(true);
      expect(mockSupabaseFrom).toHaveBeenCalledWith("ai_reply_examples");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          question: "予約キャンセルしたい",
          answer: "承知しました。予約をキャンセルいたします。",
          source: "manual_reply",
        })
      );
    });
  });

  describe("searchSimilarExamples", () => {
    it("ベクトル検索を実行する", async () => {
      const results = await searchSimilarExamples(
        "予約の取り消し",
        "00000000-0000-0000-0000-000000000001"
      );
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

describe("buildSystemPrompt 学習例統合", () => {
  it("類似学習例がプロンプトに含まれる", () => {
    const prompt = buildSystemPrompt(
      "営業時間: 10-19時",
      "丁寧に回答してください",
      [],
      [
        { question: "予約キャンセルしたい", answer: "承知しました", similarity: 0.85 },
        { question: "料金はいくら？", answer: "初診3,300円です", similarity: 0.72 },
      ]
    );

    expect(prompt).toContain("スタッフの過去の返信例");
    expect(prompt).toContain("予約キャンセルしたい");
    expect(prompt).toContain("承知しました");
    expect(prompt).toContain("料金はいくら？");
    expect(prompt).toContain("初診3,300円です");
  });

  it("学習例なしでも正常動作", () => {
    const prompt = buildSystemPrompt("KB", "指示", [], []);
    expect(prompt).not.toContain("スタッフの過去の返信例");
  });

  it("学習例undefinedでも正常動作", () => {
    const prompt = buildSystemPrompt("KB", "指示");
    expect(prompt).not.toContain("スタッフの過去の返信例");
  });
});
