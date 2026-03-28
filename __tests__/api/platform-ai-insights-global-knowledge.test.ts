// __tests__/api/platform-ai-insights-global-knowledge.test.ts
// プラットフォーム管理: グローバルナレッジベースCRUD APIテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モックチェーン ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
    "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
  ].forEach((m) => {
    (chain as Record<string, ReturnType<typeof vi.fn>>)[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(defaultResolve));
  return chain;
}

vi.mock("@/lib/supabase", () => {
  return {
    supabaseAdmin: {
      from: vi.fn((...args: unknown[]) => {
        const g = globalThis as unknown as Record<string, Record<string, Record<string, unknown>>>;
        const chains = g.__testTableChains || {};
        const table = args[0] as string;
        if (!chains[table]) {
          const c: Record<string, unknown> = {};
          [
            "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
            "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
            "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
          ].forEach((m) => {
            (c as Record<string, ReturnType<typeof vi.fn>>)[m] = vi.fn().mockReturnValue(c);
          });
          c.then = vi.fn((resolve: (v: unknown) => void) => resolve({ data: null, error: null }));
          chains[table] = c;
        }
        return chains[table];
      }),
    },
  };
});

// プラットフォーム管理者認証モック
vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: vi.fn().mockResolvedValue({
    userId: "platform-admin-1",
    email: "admin@l-ope.jp",
    name: "プラットフォーム管理者",
    tenantId: null,
    platformRole: "platform_admin",
  }),
}));

// embedding生成モック
vi.mock("@/lib/embedding", () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

// --- ルートインポート ---
import { GET, POST, PUT, DELETE } from "@/app/api/platform/ai-insights/global-knowledge/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";

// --- ヘルパー ---
function createGetRequest() {
  return new NextRequest("http://localhost:3000/api/platform/ai-insights/global-knowledge", {
    method: "GET",
  });
}

function createPostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/platform/ai-insights/global-knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createPutRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/platform/ai-insights/global-knowledge", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/platform/ai-insights/global-knowledge", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setTableChain(table: string, chain: Record<string, unknown>) {
  const g = globalThis as unknown as Record<string, Record<string, Record<string, unknown>>>;
  g.__testTableChains[table] = chain;
}

describe("グローバルナレッジベース API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as Record<string, Record<string, unknown>>).__testTableChains = {};

    // clearAllMocksで消えるのでデフォルトモックを再設定
    vi.mocked(verifyPlatformAdmin).mockResolvedValue({
      userId: "platform-admin-1",
      email: "admin@l-ope.jp",
      name: "プラットフォーム管理者",
      tenantId: null,
      platformRole: "platform_admin",
    });
  });

  // --- 認証テスト ---
  describe("認証", () => {
    it("GET: 認証失敗時は403", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValue(null);
      const res = await GET(createGetRequest());
      expect(res.status).toBe(403);
    });

    it("POST: 認証失敗時は403", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValue(null);
      const res = await POST(createPostRequest({ question: "Q", answer: "A" }));
      expect(res.status).toBe(403);
    });

    it("PUT: 認証失敗時は403", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValue(null);
      const res = await PUT(createPutRequest({ id: 1, question: "Q", answer: "A" }));
      expect(res.status).toBe(403);
    });

    it("DELETE: 認証失敗時は403", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValue(null);
      const res = await DELETE(createDeleteRequest({ id: 1 }));
      expect(res.status).toBe(403);
    });
  });

  // --- GET（一覧取得） ---
  describe("GET /global-knowledge", () => {
    it("ナレッジ一覧を返す", async () => {
      const mockData = [
        { id: 1, question: "Q1", answer: "A1", source: "manual_reply", used_count: 5, created_at: "2026-03-01", updated_at: null },
        { id: 2, question: "Q2", answer: "A2", source: "manual_reply", used_count: 3, created_at: "2026-03-02", updated_at: null },
      ];
      setTableChain("ai_reply_examples", createChain({ data: mockData, error: null }));

      const res = await GET(createGetRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.examples).toHaveLength(2);
    });

    it("データなしの場合は空配列を返す", async () => {
      setTableChain("ai_reply_examples", createChain({ data: [], error: null }));

      const res = await GET(createGetRequest());
      const body = await res.json();

      expect(body.ok).toBe(true);
      expect(body.examples).toEqual([]);
    });

    it("DBエラー時は500を返す", async () => {
      const brokenChain = createChain();
      brokenChain.then = vi.fn(() => { throw new Error("DB error"); });
      setTableChain("ai_reply_examples", brokenChain);

      const res = await GET(createGetRequest());
      expect(res.status).toBe(500);
    });
  });

  // --- POST（追加） ---
  describe("POST /global-knowledge", () => {
    it("ナレッジを追加できる", async () => {
      const mockInserted = { id: 10, question: "新しい質問", answer: "新しい回答", source: "manual_reply", used_count: 0 };
      setTableChain("ai_reply_examples", createChain({ data: mockInserted, error: null }));

      const res = await POST(createPostRequest({ question: "新しい質問", answer: "新しい回答" }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.example).toHaveProperty("id");
    });

    it("質問が空の場合は400を返す", async () => {
      const res = await POST(createPostRequest({ question: "", answer: "回答" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe("質問と回答は必須です");
    });

    it("回答が空の場合は400を返す", async () => {
      const res = await POST(createPostRequest({ question: "質問", answer: "" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe("質問と回答は必須です");
    });

    it("質問がnullの場合は400を返す", async () => {
      const res = await POST(createPostRequest({ answer: "回答" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe("質問と回答は必須です");
    });

    it("DBエラー時は500を返す", async () => {
      const brokenChain = createChain();
      brokenChain.then = vi.fn(() => { throw new Error("Insert failed"); });
      setTableChain("ai_reply_examples", brokenChain);

      const res = await POST(createPostRequest({ question: "Q", answer: "A" }));
      expect(res.status).toBe(500);
    });
  });

  // --- PUT（更新） ---
  describe("PUT /global-knowledge", () => {
    it("ナレッジを更新できる", async () => {
      const mockUpdated = { id: 1, question: "更新Q", answer: "更新A" };
      setTableChain("ai_reply_examples", createChain({ data: mockUpdated, error: null }));

      const res = await PUT(createPutRequest({ id: 1, question: "更新Q", answer: "更新A" }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
    });

    it("IDなしの場合は400を返す", async () => {
      const res = await PUT(createPutRequest({ question: "Q", answer: "A" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe("IDは必須です");
    });

    it("質問が空の場合は400を返す", async () => {
      const res = await PUT(createPutRequest({ id: 1, question: "  ", answer: "A" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe("質問と回答は必須です");
    });
  });

  // --- DELETE（削除） ---
  describe("DELETE /global-knowledge", () => {
    it("ナレッジを削除できる", async () => {
      setTableChain("ai_reply_examples", createChain({ data: null, error: null }));

      const res = await DELETE(createDeleteRequest({ id: 1 }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
    });

    it("IDなしの場合は400を返す", async () => {
      const res = await DELETE(createDeleteRequest({}));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe("IDは必須です");
    });

    it("DBエラー時は500を返す", async () => {
      const brokenChain = createChain();
      brokenChain.then = vi.fn(() => { throw new Error("Delete failed"); });
      setTableChain("ai_reply_examples", brokenChain);

      const res = await DELETE(createDeleteRequest({ id: 1 }));
      expect(res.status).toBe(500);
    });
  });
});
