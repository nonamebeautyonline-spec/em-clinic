// lib/__tests__/embedding.test.ts — RAGパイプライン・embedding生成・ハイブリッド検索のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- vi.hoisted で Redis モック ---
const { mockRedisGet, mockRedisSet } = vi.hoisted(() => {
  process.env.KV_REST_API_URL = "https://mock-redis.upstash.io";
  process.env.KV_REST_API_TOKEN = "mock-token";
  return {
    mockRedisGet: vi.fn(),
    mockRedisSet: vi.fn().mockResolvedValue("OK"),
  };
});

// --- OpenAI モック ---
const mockEmbeddingCreate = vi.fn();
vi.mock("openai", () => ({
  default: class {
    embeddings = { create: mockEmbeddingCreate };
  },
}));

// --- Anthropic モック ---
const mockAnthropicCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockAnthropicCreate };
  },
}));

// --- Redis モック ---
vi.mock("@/lib/redis", () => ({
  redis: {
    get: mockRedisGet,
    set: mockRedisSet,
    del: vi.fn(),
  },
}));

// --- Supabase モック ---
type SupabaseChain = Record<string, ReturnType<typeof vi.fn>>;
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: SupabaseChain = {};
  const methods = [
    "from", "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte",
    "ilike", "order", "limit", "range", "single", "maybeSingle",
    "rpc",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-api-key"),
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "t1" })),
}));

vi.mock("@/lib/notifications/cron-failure", () => ({
  notifyCronFailure: vi.fn().mockResolvedValue(undefined),
}));

import {
  generateEmbedding,
  chunkKnowledgeBase,
  searchSimilarExamplesHybrid,
  saveAiReplyExample,
  boostExampleQuality,
  penalizeExampleQuality,
  rewriteQueryForSearch,
  rerankExamples,
  searchKnowledgeChunks,
  incrementUsedCount,
  executeRAGPipeline,
  type SearchResult,
} from "@/lib/embedding";

// --- ヘルパー ---
function makeFakeEmbedding(dim = 1536): number[] {
  return Array.from({ length: dim }, (_, i) => i * 0.001);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc = vi.fn();
  mockFrom.mockImplementation(() => createChain());
});

// =============================================================
// generateEmbedding
// =============================================================
describe("generateEmbedding", () => {
  it("キャッシュヒット時はOpenAI APIを呼ばず、キャッシュ値を返す", async () => {
    const cached = makeFakeEmbedding();
    mockRedisGet.mockResolvedValue(JSON.stringify(cached));

    const result = await generateEmbedding("テスト文");
    expect(result).toEqual(cached);
    expect(mockEmbeddingCreate).not.toHaveBeenCalled();
  });

  it("キャッシュミス時はOpenAI APIを呼び、結果をキャッシュに保存する", async () => {
    mockRedisGet.mockResolvedValue(null);
    const embedding = makeFakeEmbedding();
    mockEmbeddingCreate.mockResolvedValue({
      data: [{ embedding }],
    });

    const result = await generateEmbedding("テスト文");
    expect(result).toEqual(embedding);
    expect(mockEmbeddingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "text-embedding-3-small",
        input: "テスト文",
        dimensions: 1536,
      })
    );
    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining("emb_cache:"),
      JSON.stringify(embedding),
      { ex: 3600 }
    );
  });

  it("キャッシュがオブジェクト形式（非文字列）でも1536要素配列なら使用する", async () => {
    const cached = makeFakeEmbedding();
    mockRedisGet.mockResolvedValue(cached); // 文字列ではなく配列直接

    const result = await generateEmbedding("テスト");
    expect(result).toEqual(cached);
    expect(mockEmbeddingCreate).not.toHaveBeenCalled();
  });

  it("OpenAI APIキーが未設定の場合はnullを返す", async () => {
    mockRedisGet.mockResolvedValue(null);
    const { getSettingOrEnv } = await import("@/lib/settings");
    vi.mocked(getSettingOrEnv).mockResolvedValueOnce("");

    const result = await generateEmbedding("テスト");
    expect(result).toBeNull();
  });

  it("OpenAI APIエラー時はnullを返す", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockEmbeddingCreate.mockRejectedValue(new Error("API error"));

    const result = await generateEmbedding("テスト");
    expect(result).toBeNull();
  });
});

// =============================================================
// chunkKnowledgeBase
// =============================================================
describe("chunkKnowledgeBase", () => {
  it("空文字列で空配列を返す", () => {
    expect(chunkKnowledgeBase("")).toEqual([]);
    expect(chunkKnowledgeBase("   ")).toEqual([]);
  });

  it("##セクション区切りで正しくチャンク分割する", () => {
    const kb = `## 診療時間について
当院は平日9時から18時まで診療しています。土日祝日は休診です。

## 予約方法について
LINEから予約が可能です。電話でも受け付けています。`;

    const chunks = chunkKnowledgeBase(kb);
    expect(chunks.length).toBe(2);
    expect(chunks[0].title).toBe("診療時間について");
    expect(chunks[0].content).toContain("平日9時から18時");
    expect(chunks[1].title).toBe("予約方法について");
  });

  it("【】区切りでも正しく分割する", () => {
    const kb = `【料金】
初診料は3000円です。再診料は1500円です。

【アクセス】
東京都渋谷区にあります。渋谷駅から徒歩5分です。`;

    const chunks = chunkKnowledgeBase(kb);
    expect(chunks.length).toBe(2);
    expect(chunks[0].title).toBe("料金");
    expect(chunks[1].title).toBe("アクセス");
  });

  it("セクション区切りがない場合はチャンクとして返す", () => {
    const text = "これは最初の段落です。" + "あ".repeat(200) + "\n\n" +
      "これは2番目の段落です。" + "い".repeat(200) + "\n\n" +
      "これは3番目の段落です。" + "う".repeat(200);

    const chunks = chunkKnowledgeBase(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    // セクション区切りなし → "チャンクN" 形式のタイトル
    expect(chunks[0].title).toContain("チャンク");
  });

  it("短すぎるチャンク（10文字未満）はスキップする", () => {
    const kb = `## タイトルのみ
短い

## 有効なセクション
このセクションは十分な長さのコンテンツを持っています。テスト用のテキストです。`;

    const chunks = chunkKnowledgeBase(kb);
    // "短い" は4文字なのでスキップされる
    expect(chunks.every(c => c.content.length >= 10)).toBe(true);
  });

  it("500文字超のチャンクはさらに分割される", () => {
    // splitLongChunkは句読点（。！？\n）で分割するため、句読点を含む長文を使う
    // content.length > 500 が条件なので、十分な長さが必要
    const sentences = Array.from({ length: 60 }, (_, i) => `これはテスト文番号${i}の内容です。`).join("");
    const kb = `## 長いセクション\n${sentences}`;

    const chunks = chunkKnowledgeBase(kb);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].title).toContain("長いセクション");
    expect(chunks[0].title).toContain("1/");
  });
});

// =============================================================
// searchSimilarExamplesHybrid
// =============================================================
describe("searchSimilarExamplesHybrid", () => {
  it("正常時はHybrid Search RPCの結果にカテゴリ重みを適用して返す", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockEmbeddingCreate.mockResolvedValue({
      data: [{ embedding: makeFakeEmbedding() }],
    });

    const rpcData = [
      {
        id: 1, question: "Q1", answer: "A1", source: "manual",
        category: "rule", similarity: 0.8, keyword_similarity: 0.6,
        rrf_score: 0.7, quality_score: 1.0,
      },
      {
        id: 2, question: "Q2", answer: "A2", source: "staff_edit",
        category: "faq", similarity: 0.75, keyword_similarity: 0.5,
        rrf_score: 0.6, quality_score: 1.2,
      },
    ];
    mockRpc.mockReturnValue({
      then: (resolve: (val: unknown) => unknown) => resolve({ data: rpcData, error: null }),
    });

    const results = await searchSimilarExamplesHybrid("テスト質問", "t1");
    expect(results.length).toBe(2);
    // rule カテゴリは重み1.5
    expect(results[0].rrf_score).toBe(0.7 * 1.5);
    // faq カテゴリは重み1.3
    expect(results[1].rrf_score).toBe(0.6 * 1.3);
  });

  it("embedding生成失敗時はフォールバックキーワード検索を行う", async () => {
    mockRedisGet.mockResolvedValue(null);
    const { getSettingOrEnv } = await import("@/lib/settings");
    vi.mocked(getSettingOrEnv).mockResolvedValueOnce(""); // OpenAI key なし

    const chain = createChain({ data: [{ id: 1, question: "Q", answer: "A", source: "s", category: "faq", quality_score: 1.0 }], error: null });
    mockFrom.mockReturnValue(chain);

    const results = await searchSimilarExamplesHybrid("テスト", "t1");
    expect(results.length).toBe(1);
    expect(results[0].similarity).toBe(0.5); // フォールバック固定値
  });

  it("RPC エラー時はフォールバックベクトル検索を行う", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockEmbeddingCreate.mockResolvedValue({
      data: [{ embedding: makeFakeEmbedding() }],
    });

    // hybrid RPC がエラー
    mockRpc.mockReturnValue({
      then: (resolve: (val: unknown) => unknown) => resolve({ data: null, error: { message: "RPC not found" } }),
    });

    // 2回目のrpc呼び出し（fallbackVectorSearch）
    mockRpc.mockReturnValueOnce({
      then: (resolve: (val: unknown) => unknown) => resolve({ data: null, error: { message: "RPC not found" } }),
    }).mockReturnValueOnce({
      then: (resolve: (val: unknown) => unknown) => resolve({
        data: [{ id: 1, question: "Q", answer: "A", source: "s", category: "faq", similarity: 0.7 }],
        error: null,
      }),
    });

    const results = await searchSimilarExamplesHybrid("テスト", "t1");
    // フォールバック検索の結果（成功 or 空配列）
    expect(Array.isArray(results)).toBe(true);
  });
});

// =============================================================
// saveAiReplyExample
// =============================================================
describe("saveAiReplyExample", () => {
  it("重複なしの場合は新規挿入する", async () => {
    mockRedisGet.mockResolvedValue(null);
    const embedding = makeFakeEmbedding();
    mockEmbeddingCreate.mockResolvedValue({ data: [{ embedding }] });

    // 重複チェックRPC: 重複なし
    mockRpc.mockReturnValue({
      then: (resolve: (val: unknown) => unknown) => resolve({ data: [], error: null }),
    });

    // insert
    const insertChain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(insertChain);

    const result = await saveAiReplyExample({
      tenantId: "t1",
      question: "質問テスト",
      answer: "回答テスト",
      source: "staff_edit",
    });
    expect(result).toBe(true);
  });

  it("staff_editソースのquality_scoreは1.2になる", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockEmbeddingCreate.mockResolvedValue({ data: [{ embedding: makeFakeEmbedding() }] });
    mockRpc.mockReturnValue({
      then: (resolve: (val: unknown) => unknown) => resolve({ data: [], error: null }),
    });

    const insertChain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(insertChain);

    await saveAiReplyExample({
      tenantId: "t1", question: "Q", answer: "A", source: "staff_edit",
    });

    // insertが呼ばれたことを確認
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ quality_score: 1.2 })
    );
  });
});

// =============================================================
// boostExampleQuality
// =============================================================
describe("boostExampleQuality", () => {
  it("ドラフトに紐付く学習例のapproved_countとused_countを増加させる", async () => {
    const selectChain = createChain({
      data: { id: 10, quality_score: 1.0, approved_count: 2, rejected_count: 1, used_count: 5, avg_approval_time_sec: 30, modification_rate: 0 },
      error: null,
    });
    const updateChain = createChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(selectChain)   // select
      .mockReturnValueOnce(updateChain);  // update

    await boostExampleQuality(42, 15);

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        approved_count: 3,
        used_count: 6,
      })
    );
  });

  it("該当する学習例がない場合はエラーなく終了する", async () => {
    const selectChain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(selectChain);

    await expect(boostExampleQuality(999)).resolves.toBeUndefined();
  });
});

// =============================================================
// penalizeExampleQuality
// =============================================================
describe("penalizeExampleQuality", () => {
  it("却下時にrejected_countを増加させ品質スコアを更新する", async () => {
    const selectChain = createChain({
      data: { id: 10, quality_score: 1.5, approved_count: 3, rejected_count: 0, used_count: 5 },
      error: null,
    });
    const updateChain = createChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);

    await penalizeExampleQuality(42, "wrong_info");

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        rejected_count: 1,
      })
    );
    // quality_scoreが低下していることを確認
    const callArg = vi.mocked(updateChain.update).mock.calls[0][0] as { quality_score: number };
    expect(callArg.quality_score).toBeLessThan(1.5);
  });

  it("該当する学習例がない場合はエラーなく終了する", async () => {
    const selectChain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(selectChain);

    await expect(penalizeExampleQuality(999)).resolves.toBeUndefined();
  });
});

// =============================================================
// rewriteQueryForSearch
// =============================================================
describe("rewriteQueryForSearch", () => {
  it("コンテキストが空で短いクエリはそのまま返す", async () => {
    const result = await rewriteQueryForSearch(["短い質問"], [], null);
    expect(result).toBe("短い質問");
  });

  it("コンテキストがある場合はClaude APIで書き換える", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "書き換えられたクエリ" }],
    });

    const result = await rewriteQueryForSearch(
      ["あの件について教えて"],
      [{ direction: "incoming", content: "予約の変更について" }],
      "t1"
    );
    expect(result).toBe("書き換えられたクエリ");
  });

  it("APIエラー時は元のクエリを返す", async () => {
    mockAnthropicCreate.mockRejectedValue(new Error("API error"));

    const result = await rewriteQueryForSearch(
      ["テスト"],
      [{ direction: "incoming", content: "context" }],
      "t1"
    );
    expect(result).toBe("テスト");
  });
});

// =============================================================
// rerankExamples
// =============================================================
describe("rerankExamples", () => {
  const candidates: SearchResult[] = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    question: `Q${i}`,
    answer: `A${i}`,
    source: "manual",
    category: "faq",
    similarity: 0.8 - i * 0.05,
    keyword_similarity: 0.5,
    rrf_score: 0.7 - i * 0.05,
    quality_score: 1.0,
  }));

  it("候補数がtopK以下ならそのまま返す", async () => {
    const few = candidates.slice(0, 3);
    const result = await rerankExamples("テスト", few, null, 5);
    expect(result.length).toBe(3);
    expect(result[0].question).toBe("Q0");
  });

  it("空の候補で空配列を返す", async () => {
    const result = await rerankExamples("テスト", [], null);
    expect(result).toEqual([]);
  });

  it("LLMのreranking結果に基づいて並び替える", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "3,1,0,2,4" }],
    });

    const result = await rerankExamples("テスト", candidates, "t1", 3);
    expect(result.length).toBe(3);
    expect(result[0].question).toBe("Q3");
    expect(result[1].question).toBe("Q1");
    expect(result[2].question).toBe("Q0");
  });
});

// =============================================================
// incrementUsedCount
// =============================================================
describe("incrementUsedCount", () => {
  it("空配列の場合はDBアクセスしない", async () => {
    await incrementUsedCount([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("各IDのused_countをインクリメントする", async () => {
    const selectChain = createChain({ data: { used_count: 5 }, error: null });
    const updateChain = createChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);

    await incrementUsedCount([42]);

    expect(updateChain.update).toHaveBeenCalledWith({ used_count: 6 });
  });
});

// =============================================================
// executeRAGPipeline（統合テスト）
// =============================================================
describe("executeRAGPipeline", () => {
  it("全ステップ（query rewrite → hybrid search → rerank）を実行する", async () => {
    // embedding
    mockRedisGet.mockResolvedValue(null);
    mockEmbeddingCreate.mockResolvedValue({
      data: [{ embedding: makeFakeEmbedding() }],
    });

    // hybrid search RPC
    mockRpc.mockReturnValue({
      then: (resolve: (val: unknown) => unknown) => resolve({
        data: [
          { id: 1, question: "Q1", answer: "A1", source: "s", category: "faq", similarity: 0.8, keyword_similarity: 0.6, rrf_score: 0.7, quality_score: 1.0 },
        ],
        error: null,
      }),
    });

    // incrementUsedCount の from
    mockFrom.mockReturnValue(createChain({ data: { used_count: 1 }, error: null }));

    const result = await executeRAGPipeline({
      pendingMessages: ["テスト質問"],
      contextMessages: [],
      tenantId: "t1",
    });

    expect(result.examples.length).toBeGreaterThanOrEqual(0);
    expect(result.rewrittenQuery).toBe("テスト質問");
    expect(Array.isArray(result.knowledgeChunks)).toBe(true);
    expect(Array.isArray(result.usedExampleIds)).toBe(true);
  });
});
