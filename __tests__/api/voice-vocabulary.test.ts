// 辞書管理API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

// Supabase チェインモック
function createChainMock(finalData: unknown = null, finalError: unknown = null) {
  const chain: Record<string, any> = {};
  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.or = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.single = vi.fn(() => ({ data: finalData, error: finalError }));
  // 終端としても使えるように
  chain.data = finalData;
  chain.error = finalError;
  // then を持たせて await 可能に
  chain.then = (resolve: (v: unknown) => void) =>
    resolve({ data: finalData, error: finalError });
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "medical_vocabulary") {
        return {
          select: (...args: unknown[]) => {
            const result = mockSelect(...args);
            return result;
          },
          insert: (...args: unknown[]) => {
            const result = mockInsert(...args);
            return result;
          },
          update: (...args: unknown[]) => {
            const result = mockUpdate(...args);
            return result;
          },
          delete: (...args: unknown[]) => {
            const result = mockDelete(...args);
            return result;
          },
        };
      }
      return createChainMock();
    }),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(() => true),
  getAdminUserId: vi.fn(() => "admin-1"),
  getAdminTenantId: vi.fn(() => "test-tenant"),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(() => null),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tenantId: string) => ({ tenant_id: tenantId })),
}));

beforeEach(() => {
  vi.resetModules();
  mockInsert.mockReset();
  mockSelect.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
});

// リクエスト生成ヘルパー
function createRequest(
  method: string,
  body?: unknown,
  queryString = ""
): Request {
  const url = `http://localhost/api/admin/voice/vocabulary${queryString}`;
  const init: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init);
}

describe("GET /api/admin/voice/vocabulary", () => {
  it("辞書一覧を取得できる", async () => {
    const items = [
      { id: "1", term: "マンジャロ", category: "drug", specialty: "beauty" },
      { id: "2", term: "フィナステリド", category: "drug", specialty: "beauty" },
    ];
    const chain = createChainMock(items);
    mockSelect.mockReturnValue(chain);

    const { GET } = await import("@/app/api/admin/voice/vocabulary/route");
    const req = createRequest("GET");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual(items);
    expect(body.count).toBe(2);
  });
});

describe("POST /api/admin/voice/vocabulary", () => {
  it("用語を追加できる", async () => {
    // 重複チェック: 既存なし
    const selectChain = createChainMock([]);
    selectChain.eq = vi.fn(() => selectChain);
    mockSelect.mockReturnValue(selectChain);

    // INSERT
    const newItem = {
      id: "new-uuid",
      term: "チルゼパチド",
      reading: null,
      category: "drug",
      specialty: "beauty",
      boost_weight: 2.0,
      is_default: false,
    };
    const insertChain = createChainMock(newItem);
    mockInsert.mockReturnValue(insertChain);

    const { POST } = await import("@/app/api/admin/voice/vocabulary/route");
    const req = createRequest("POST", {
      term: "チルゼパチド",
      category: "drug",
      specialty: "beauty",
      boost_weight: 2.0,
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.item.term).toBe("チルゼパチド");
  });

  it("バリデーションエラー: 空のterm", async () => {
    const { POST } = await import("@/app/api/admin/voice/vocabulary/route");
    const req = createRequest("POST", { term: "", category: "drug" });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("バリデーションエラー: 不正なcategory", async () => {
    const { POST } = await import("@/app/api/admin/voice/vocabulary/route");
    const req = createRequest("POST", { term: "テスト", category: "invalid" });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("バリデーションエラー: boost_weight 範囲外", async () => {
    const { POST } = await import("@/app/api/admin/voice/vocabulary/route");
    const req = createRequest("POST", { term: "テスト", boost_weight: 5.0 });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/admin/voice/vocabulary", () => {
  it("用語を更新できる", async () => {
    // 存在チェック
    const selectChain = createChainMock({ id: "uuid-1" });
    mockSelect.mockReturnValue(selectChain);

    // UPDATE
    const updatedItem = { id: "uuid-1", term: "更新済み", boost_weight: 2.5 };
    const updateChain = createChainMock(updatedItem);
    mockUpdate.mockReturnValue(updateChain);

    const { PUT } = await import("@/app/api/admin/voice/vocabulary/route");
    const req = createRequest("PUT", {
      id: "550e8400-e29b-41d4-a716-446655440000",
      term: "更新済み",
      boost_weight: 2.5,
    });
    const res = await PUT(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

describe("DELETE /api/admin/voice/vocabulary", () => {
  it("用語を削除できる", async () => {
    const deleteChain = createChainMock(null, null);
    mockDelete.mockReturnValue(deleteChain);

    const { DELETE } = await import("@/app/api/admin/voice/vocabulary/route");
    const req = createRequest("DELETE", {
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    const res = await DELETE(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("バリデーションエラー: 不正なUUID", async () => {
    const { DELETE } = await import("@/app/api/admin/voice/vocabulary/route");
    const req = createRequest("DELETE", { id: "not-a-uuid" });
    const res = await DELETE(req as any);
    expect(res.status).toBe(400);
  });
});

describe("デフォルト辞書データ", () => {
  it("全診療科のデフォルト辞書が定義されている", async () => {
    const { DEFAULT_VOCABULARY, SPECIALTY_LABELS, getVocabularySummary } = await import(
      "@/lib/voice/default-vocabulary"
    );

    const specialties = Object.keys(SPECIALTY_LABELS);
    expect(specialties).toContain("common");
    expect(specialties).toContain("beauty");
    expect(specialties).toContain("internal");
    expect(specialties).toContain("surgery");
    expect(specialties).toContain("orthopedics");
    expect(specialties).toContain("dermatology");

    // 各科に用語が存在する
    for (const sp of specialties) {
      expect(DEFAULT_VOCABULARY[sp as keyof typeof DEFAULT_VOCABULARY].length).toBeGreaterThan(0);
    }

    const summary = getVocabularySummary();
    expect(summary.common).toBeGreaterThan(20);
    expect(summary.beauty).toBeGreaterThan(30);
  });

  it("getDefaultVocabulary で共通 + 選択科の辞書を取得できる", async () => {
    const { getDefaultVocabulary, DEFAULT_VOCABULARY } = await import(
      "@/lib/voice/default-vocabulary"
    );

    const vocab = getDefaultVocabulary(["beauty"]);
    // 共通 + 美容 の合計
    const expectedMin = DEFAULT_VOCABULARY.common.length;
    expect(vocab.length).toBeGreaterThanOrEqual(expectedMin);

    // 美容の用語が含まれている
    const terms = vocab.map((v) => v.term);
    expect(terms).toContain("マンジャロ");
    expect(terms).toContain("フィナステリド");
    // 共通の用語も含まれている
    expect(terms).toContain("処方");
    expect(terms).toContain("副作用");
  });

  it("重複する用語は除外される", async () => {
    const { getDefaultVocabulary } = await import("@/lib/voice/default-vocabulary");

    const vocab = getDefaultVocabulary(["beauty", "internal", "surgery"]);
    const terms = vocab.map((v) => v.term);
    const uniqueTerms = new Set(terms);
    // 重複がないことを確認
    expect(terms.length).toBe(uniqueTerms.size);
  });
});

describe("Zodスキーマ", () => {
  it("createVocabularySchema が正しくバリデーションする", async () => {
    const { createVocabularySchema } = await import("@/lib/validations/voice");

    // 正常ケース
    const valid = createVocabularySchema.parse({
      term: "テスト薬",
      category: "drug",
      boost_weight: 2.0,
    });
    expect(valid.term).toBe("テスト薬");
    expect(valid.specialty).toBe("common"); // デフォルト値

    // 異常ケース
    expect(() => createVocabularySchema.parse({ term: "" })).toThrow();
    expect(() => createVocabularySchema.parse({ term: "OK", category: "invalid" })).toThrow();
    expect(() => createVocabularySchema.parse({ term: "OK", boost_weight: 10 })).toThrow();
  });
});
