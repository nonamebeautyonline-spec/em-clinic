// lib/__tests__/ai-semantic-reuse.test.ts — Semantic Reuse テスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---
const mockRpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock("@/lib/embedding", () => ({
  generateEmbedding: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query: unknown) => query),
}));

import { searchReuseCandidate } from "@/lib/ai-semantic-reuse";
import { generateEmbedding } from "@/lib/embedding";

// --- ヘルパー: RPC戻り値の行を生成 ---
function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    question: "診察時間は何時ですか？",
    answer: "診察時間は9:00〜18:00です。",
    source: "staff_edit",
    similarity: 0.95,
    quality_score: 1.5,
    created_at: new Date().toISOString(),
    category: null,
    ...overrides,
  };
}

describe("searchReuseCandidate", () => {
  const defaultParams = {
    queryText: "診察時間を教えてください",
    tenantId: "tenant-001",
    aiCategory: "general",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: embedding生成成功
    vi.mocked(generateEmbedding).mockResolvedValue(Array(1536).fill(0.1));
  });

  it("高類似度 + staff_edit + quality>=1.0 + 30日以内 → found=true", async () => {
    mockRpc.mockResolvedValue({
      data: [makeRow({ similarity: 0.95, quality_score: 1.5 })],
      error: null,
    });

    const result = await searchReuseCandidate(defaultParams);

    expect(result.found).toBe(true);
    expect(result.reason).toBe("match");
    expect(result.candidate).not.toBeNull();
    expect(result.candidate!.similarity).toBe(0.95);
    expect(result.candidate!.qualityScore).toBe(1.5);
  });

  it("類似度 0.90（閾値未満）→ found=false, reason='no_match'", async () => {
    mockRpc.mockResolvedValue({
      data: [makeRow({ similarity: 0.90 })],
      error: null,
    });

    const result = await searchReuseCandidate(defaultParams);

    expect(result.found).toBe(false);
    expect(result.reason).toBe("no_match");
    expect(result.candidate).toBeNull();
  });

  it("quality_score=0.5 → found=false（品質スコア不足で除外）", async () => {
    mockRpc.mockResolvedValue({
      data: [makeRow({ similarity: 0.95, quality_score: 0.5 })],
      error: null,
    });

    const result = await searchReuseCandidate(defaultParams);

    expect(result.found).toBe(false);
    expect(result.reason).toBe("quality_too_low");
    expect(result.candidate).toBeNull();
  });

  it("created_at が 31日前 → found=false（有効期限切れ）", async () => {
    const expired = new Date();
    expired.setDate(expired.getDate() - 31);

    mockRpc.mockResolvedValue({
      data: [makeRow({ similarity: 0.95, created_at: expired.toISOString() })],
      error: null,
    });

    const result = await searchReuseCandidate(defaultParams);

    expect(result.found).toBe(false);
    expect(result.reason).toBe("expired");
    expect(result.candidate).toBeNull();
  });

  it("source='manual_reply' → found=false（staff_editのみ対象）", async () => {
    mockRpc.mockResolvedValue({
      data: [makeRow({ similarity: 0.95, source: "manual_reply" })],
      error: null,
    });

    const result = await searchReuseCandidate(defaultParams);

    expect(result.found).toBe(false);
    expect(result.reason).toBe("no_match");
    expect(result.candidate).toBeNull();
  });

  it("tenantId が null の場合も正常動作する", async () => {
    mockRpc.mockResolvedValue({
      data: [makeRow({ similarity: 0.95 })],
      error: null,
    });

    const result = await searchReuseCandidate({
      queryText: "診察時間を教えてください",
      tenantId: null,
      aiCategory: "general",
    });

    expect(result.found).toBe(true);
    expect(result.reason).toBe("match");
    // RPCにnullが渡されることを確認
    expect(mockRpc).toHaveBeenCalledWith("match_ai_reply_examples", {
      query_embedding: expect.any(Array),
      match_threshold: 0.92,
      match_count: 5,
      p_tenant_id: null,
    });
  });

  it("generateEmbedding 失敗時 → found=false, reason='embedding_error'", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue(null);

    const result = await searchReuseCandidate(defaultParams);

    expect(result.found).toBe(false);
    expect(result.reason).toBe("embedding_error");
    expect(result.candidate).toBeNull();
    // RPCは呼ばれない
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
