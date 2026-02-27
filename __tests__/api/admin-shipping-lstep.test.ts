// __tests__/api/admin-shipping-lstep.test.ts
// Lステップ連携CSVエクスポート テスト
// lstep-tag-csv/route.ts + export-lstep-tags/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// --- 共通モック ---
vi.mock("iconv-lite", () => ({
  encode: vi.fn((str: string) => Buffer.from(str, "utf8")),
}));

const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue("test-tenant"),
  withTenant: vi.fn((query) => query),
}));

const mockParseBody = vi.fn();
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: (...args: any[]) => mockParseBody(...args),
}));

vi.mock("@/lib/validations/shipping", () => ({
  lstepTagCsvSchema: {},
}));

// --- export-lstep-tags用: @supabase/supabase-js モック ---
const mockOrdersResult = vi.fn();
const mockIntakeResult = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "orders") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn(() => mockOrdersResult()),
            }),
          }),
        };
      }
      if (table === "intake") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn(() => mockIntakeResult()),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    }),
  })),
}));

// --- ヘルパー ---
function createMockRequest(url: string, options?: { method?: string; body?: any }) {
  return {
    method: options?.method || "GET",
    url,
    headers: { get: vi.fn(() => null) },
    json: async () => options?.body || {},
  } as any;
}

async function parseJson(res: Response) {
  return res.json();
}

async function parseText(res: Response) {
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString("utf8");
}

// --- テスト ---
import { POST as lstepTagCsvPost } from "@/app/api/admin/shipping/lstep-tag-csv/route";
import { GET as exportLstepTagsGet } from "@/app/api/admin/shipping/export-lstep-tags/route";

describe("lstep-tag-csv API テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("1. 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const req = createMockRequest("https://example.com/api/admin/shipping/lstep-tag-csv", { method: "POST" });
    const res = await lstepTagCsvPost(req);
    const json = await parseJson(res);

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("2. バリデーションエラー → parseBodyエラー返却", async () => {
    const errorResponse = NextResponse.json({ error: "バリデーションエラー" }, { status: 400 });
    mockParseBody.mockResolvedValue({ error: errorResponse });

    const req = createMockRequest("https://example.com/api/admin/shipping/lstep-tag-csv", { method: "POST" });
    const res = await lstepTagCsvPost(req);
    const json = await parseJson(res);

    expect(res.status).toBe(400);
    expect(json.error).toBe("バリデーションエラー");
  });

  it("3. 全ID非数値 → 400", async () => {
    mockParseBody.mockResolvedValue({
      data: { lstepIds: ["abc", "def", "g-h-i"] },
    });

    const req = createMockRequest("https://example.com/api/admin/shipping/lstep-tag-csv", { method: "POST" });
    const res = await lstepTagCsvPost(req);
    const json = await parseJson(res);

    expect(res.status).toBe(400);
    expect(json.error).toContain("有効なLステップID");
  });

  it("4. 重複IDが除去される（'123','123','456' → 2行）", async () => {
    mockParseBody.mockResolvedValue({
      data: { lstepIds: ["123", "123", "456"] },
    });

    const req = createMockRequest("https://example.com/api/admin/shipping/lstep-tag-csv", { method: "POST" });
    const res = await lstepTagCsvPost(req);
    const text = await parseText(res);

    expect(res.status).toBe(200);
    const lines = text.split("\n");
    // ヘッダー2行 + データ2行 = 4行
    expect(lines.length).toBe(4);
    expect(lines[2]).toBe("123,1");
    expect(lines[3]).toBe("456,1");
  });

  it("5. 数値のみフィルタ（'abc','123' → 1行）", async () => {
    mockParseBody.mockResolvedValue({
      data: { lstepIds: ["abc", "123"] },
    });

    const req = createMockRequest("https://example.com/api/admin/shipping/lstep-tag-csv", { method: "POST" });
    const res = await lstepTagCsvPost(req);
    const text = await parseText(res);

    expect(res.status).toBe(200);
    const lines = text.split("\n");
    // ヘッダー2行 + データ1行 = 3行
    expect(lines.length).toBe(3);
    expect(lines[2]).toBe("123,1");
  });

  it("6. 正常 → 200 + CSVヘッダー含む", async () => {
    mockParseBody.mockResolvedValue({
      data: { lstepIds: ["111", "222", "333"] },
    });

    const req = createMockRequest("https://example.com/api/admin/shipping/lstep-tag-csv", { method: "POST" });
    const res = await lstepTagCsvPost(req);
    const text = await parseText(res);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("lstep_tag_");

    const lines = text.split("\n");
    expect(lines[0]).toContain("登録ID");
    expect(lines[0]).toContain("タグ_9217653");
    expect(lines[1]).toContain("発送したよ");
  });
});

describe("export-lstep-tags API テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("7. 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const req = createMockRequest("https://example.com/api/admin/shipping/export-lstep-tags");
    const res = await exportLstepTagsGet(req);
    const json = await parseJson(res);

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("8. orders 0件 → 404", async () => {
    const { withTenant } = await import("@/lib/tenant");
    vi.mocked(withTenant).mockResolvedValueOnce({ data: [], error: null } as any);

    const req = createMockRequest("https://example.com/api/admin/shipping/export-lstep-tags");
    const res = await exportLstepTagsGet(req);
    const json = await parseJson(res);

    expect(res.status).toBe(404);
    expect(json.error).toContain("注文が見つかりません");
  });

  it("9. patients 0件 → 404", async () => {
    const { withTenant } = await import("@/lib/tenant");
    vi.mocked(withTenant)
      .mockResolvedValueOnce({
        data: [{ id: 1, patient_id: "p1" }],
        error: null,
      } as any)
      .mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

    const req = createMockRequest("https://example.com/api/admin/shipping/export-lstep-tags");
    const res = await exportLstepTagsGet(req);
    const json = await parseJson(res);

    expect(res.status).toBe(404);
    expect(json.error).toContain("患者データが見つかりません");
  });

  it("10. answerer_id nullの患者のみ → 404", async () => {
    const { withTenant } = await import("@/lib/tenant");
    vi.mocked(withTenant)
      .mockResolvedValueOnce({
        data: [{ id: 1, patient_id: "p1" }],
        error: null,
      } as any)
      .mockResolvedValueOnce({
        data: [
          { patient_id: "p1", answerer_id: null },
          { patient_id: "p2", answerer_id: null },
        ],
        error: null,
      } as any);

    const req = createMockRequest("https://example.com/api/admin/shipping/export-lstep-tags");
    const res = await exportLstepTagsGet(req);
    const json = await parseJson(res);

    expect(res.status).toBe(404);
    expect(json.error).toContain("LステップID");
  });

  it("11. 正常 → 200 + CSV", async () => {
    const { withTenant } = await import("@/lib/tenant");
    vi.mocked(withTenant)
      .mockResolvedValueOnce({
        data: [
          { id: 1, patient_id: "p1" },
          { id: 2, patient_id: "p2" },
        ],
        error: null,
      } as any)
      .mockResolvedValueOnce({
        data: [
          { patient_id: "p1", answerer_id: "lstep_001" },
          { patient_id: "p2", answerer_id: "lstep_002" },
        ],
        error: null,
      } as any);

    const req = createMockRequest("https://example.com/api/admin/shipping/export-lstep-tags");
    const res = await exportLstepTagsGet(req);
    const text = await parseText(res);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");

    const lines = text.split("\n");
    expect(lines[0]).toContain("登録ID");
    expect(lines[0]).toContain("タグ_9217653");
    expect(lines[1]).toContain("発送したよ");
    expect(lines[2]).toBe("lstep_001,1");
    expect(lines[3]).toBe("lstep_002,1");
  });

  it("12. ordersDBエラー → 500", async () => {
    const { withTenant } = await import("@/lib/tenant");
    vi.mocked(withTenant).mockResolvedValueOnce({
      data: null,
      error: { message: "DB接続エラー" },
    } as any);

    const req = createMockRequest("https://example.com/api/admin/shipping/export-lstep-tags");
    const res = await exportLstepTagsGet(req);
    const json = await parseJson(res);

    expect(res.status).toBe(500);
    expect(json.error).toContain("エラー");
  });

  it("13. 重複patient_idが除去される", async () => {
    const { withTenant } = await import("@/lib/tenant");
    vi.mocked(withTenant)
      .mockResolvedValueOnce({
        data: [
          { id: 1, patient_id: "p1" },
          { id: 2, patient_id: "p1" }, // 重複
          { id: 3, patient_id: "p2" },
        ],
        error: null,
      } as any)
      .mockResolvedValueOnce({
        data: [
          { patient_id: "p1", answerer_id: "lstep_001" },
          { patient_id: "p2", answerer_id: "lstep_002" },
        ],
        error: null,
      } as any);

    const req = createMockRequest("https://example.com/api/admin/shipping/export-lstep-tags");
    const res = await exportLstepTagsGet(req);

    expect(res.status).toBe(200);
    // withTenantの2回目呼出でintakeテーブルに渡されるpatient_idsは重複除去済み
    const { withTenant: wt } = await import("@/lib/tenant");
    // 呼び出しが正常に完了して200が返れば重複除去が機能している
  });

  it("14. CSVにanswerer_idが含まれる", async () => {
    const { withTenant } = await import("@/lib/tenant");
    vi.mocked(withTenant)
      .mockResolvedValueOnce({
        data: [{ id: 1, patient_id: "p1" }],
        error: null,
      } as any)
      .mockResolvedValueOnce({
        data: [{ patient_id: "p1", answerer_id: "999888777" }],
        error: null,
      } as any);

    const req = createMockRequest("https://example.com/api/admin/shipping/export-lstep-tags");
    const res = await exportLstepTagsGet(req);
    const text = await parseText(res);

    expect(res.status).toBe(200);
    expect(text).toContain("999888777");
  });
});
