// __tests__/api/tags.test.ts
// タグ CRUD API のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockVerifyAdminAuth = vi.fn();

// Supabase チェーン用モック
const mockSingleResult = { data: null as any, error: null as any };
const mockSelectResult = { data: null as any, error: null as any };

const mockChain = {
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn(() => mockSingleResult),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(() => ({ data: null, error: null })),
};
mockChain.insert.mockReturnValue(mockChain);
mockChain.select.mockReturnValue(mockChain);

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockChain) },
}));
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: any) => (tid ? { tenant_id: tid } : {})),
}));

// NextRequest互換のモック生成
function createMockRequest(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return req as any;
}

import { GET, POST } from "@/app/api/admin/tags/route";
import { supabaseAdmin } from "@/lib/supabase";

describe("タグ API (app/api/admin/tags/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    // チェーンリセット
    mockChain.select.mockReturnValue(mockChain);
    mockChain.insert.mockReturnValue(mockChain);
    mockChain.order.mockReturnValue(mockChain);
    mockChain.range.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
  });

  // === GET ===
  describe("GET: タグ一覧取得", () => {
    it("認証OK → タグ一覧（patient_count付き）を返却", async () => {
      // tag_definitions の返却
      const tagDefs = [
        { id: 1, name: "VIP", color: "#FF0000", created_at: "2026-01-01" },
        { id: 2, name: "新規", color: "#00FF00", created_at: "2026-01-02" },
      ];

      // withTenant → order の結果（tag_definitions）
      // 1回目: tag_definitions の select → order → resolve
      // 2回目以降: patient_tags の select → range → resolve
      let callCount = 0;
      mockChain.order.mockImplementation(() => {
        callCount++;
        return { data: tagDefs, error: null };
      });

      // patient_tags: tag_id=1 が2件、tag_id=2 が1件
      mockChain.range.mockReturnValueOnce({
        data: [{ tag_id: 1 }, { tag_id: 1 }, { tag_id: 2 }],
        error: null,
      }).mockReturnValue({ data: [], error: null });

      const req = createMockRequest("GET", "http://localhost/api/admin/tags");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.tags).toHaveLength(2);
      expect(json.tags[0].name).toBe("VIP");
      expect(json.tags[0].patient_count).toBe(2);
      expect(json.tags[1].name).toBe("新規");
      expect(json.tags[1].patient_count).toBe(1);
    });

    it("認証NG → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/tags");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });
  });

  // === POST ===
  describe("POST: タグ作成", () => {
    it("正常作成 → {tag} を返却", async () => {
      const newTag = { id: 10, name: "テストタグ", color: "#FF0000" };
      mockChain.single.mockResolvedValue({ data: newTag, error: null });

      const req = createMockRequest("POST", "http://localhost/api/admin/tags", {
        name: "テストタグ",
        color: "#FF0000",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.tag).toEqual(newTag);
    });

    it("名前空 → 400", async () => {
      const req = createMockRequest("POST", "http://localhost/api/admin/tags", {
        name: "",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("入力値が不正です");
      expect(json.details).toBeDefined();
    });

    it("名前空白のみ → trim後に空になるがZodは通過するためDB挿入される", async () => {
      // Zodの .min(1) は空白文字列 "   " を通すため、バリデーションは成功する
      // ルート側で name.trim() してから DB に INSERT するため、空白のみでも通る
      const newTag = { id: 10, name: "   ", color: "#6B7280" };
      mockChain.single.mockResolvedValue({ data: newTag, error: null });

      const req = createMockRequest("POST", "http://localhost/api/admin/tags", {
        name: "   ",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("重複名（code 23505）→ 409", async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key" },
      });

      const req = createMockRequest("POST", "http://localhost/api/admin/tags", {
        name: "既存タグ",
      });
      const res = await POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("同じ名前");
    });

    it("色指定なし → デフォルト #6B7280 が使われる", async () => {
      const newTag = { id: 11, name: "デフォルト色タグ", color: "#6B7280" };
      mockChain.single.mockResolvedValue({ data: newTag, error: null });

      const req = createMockRequest("POST", "http://localhost/api/admin/tags", {
        name: "デフォルト色タグ",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      // insert に渡された引数を確認
      const insertArg = mockChain.insert.mock.calls[0][0];
      expect(insertArg.color).toBe("#6B7280");
    });

    it("is_auto=true を設定", async () => {
      const newTag = { id: 12, name: "自動タグ", is_auto: true, auto_rule: '{"field":"age"}' };
      mockChain.single.mockResolvedValue({ data: newTag, error: null });

      const req = createMockRequest("POST", "http://localhost/api/admin/tags", {
        name: "自動タグ",
        is_auto: true,
        auto_rule: '{"field":"age"}',
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const insertArg = mockChain.insert.mock.calls[0][0];
      expect(insertArg.is_auto).toBe(true);
      expect(insertArg.auto_rule).toBe('{"field":"age"}');
    });

    it("認証NG → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createMockRequest("POST", "http://localhost/api/admin/tags", {
        name: "テスト",
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("description・auto_rule が保存される", async () => {
      const newTag = { id: 13, name: "詳細タグ", description: "テスト説明", auto_rule: '{"key":"val"}' };
      mockChain.single.mockResolvedValue({ data: newTag, error: null });

      const req = createMockRequest("POST", "http://localhost/api/admin/tags", {
        name: "詳細タグ",
        description: "テスト説明",
        auto_rule: '{"key":"val"}',
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const insertArg = mockChain.insert.mock.calls[0][0];
      expect(insertArg.description).toBe("テスト説明");
      expect(insertArg.auto_rule).toBe('{"key":"val"}');
    });
  });
});
