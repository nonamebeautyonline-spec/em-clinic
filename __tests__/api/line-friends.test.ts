// __tests__/api/line-friends.test.ts
// LINE友だちブロック確認 API のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockVerifyAdminAuth = vi.fn();
const mockGetSettingOrEnv = vi.fn();

// Supabase チェーン用モック
const mockChain = {
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: (...args: any[]) => mockGetSettingOrEnv(...args),
}));

// fetch モック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// NextRequest互換のモック生成
function createMockRequest(method: string, url: string) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
  });
  return req as any;
}

import { GET } from "@/app/api/admin/line/check-block/route";
import { supabaseAdmin } from "@/lib/supabase";

describe("LINEブロック確認 API (app/api/admin/line/check-block/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockGetSettingOrEnv.mockResolvedValue("test-line-token");
    // チェーンリセット
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.order.mockReturnValue(mockChain);
    mockChain.limit.mockReturnValue(mockChain);
    mockChain.insert.mockReturnValue(mockChain);
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("ブロックなし（Profile API成功）→ {blocked:false}", async () => {
    // patients テーブルから line_id 取得
    mockChain.maybeSingle
      .mockResolvedValueOnce({ data: { line_id: "U_LINE_001" }, error: null });
    // LINE Profile API 成功
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ displayName: "テスト" }) });

    const req = createMockRequest("GET", "http://localhost/api/admin/line/check-block?patient_id=P001");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.blocked).toBe(false);
  });

  it("ブロックあり（Profile API失敗）→ {blocked:true}", async () => {
    // patients テーブルから line_id 取得
    mockChain.maybeSingle
      .mockResolvedValueOnce({ data: { line_id: "U_LINE_002" }, error: null })
      // message_log の最新イベント取得: まだunfollow記録なし
      .mockResolvedValueOnce({ data: null, error: null });
    // LINE Profile API 失敗（ブロック）
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    // insert は成功
    mockChain.insert.mockReturnValue({ data: null, error: null });

    const req = createMockRequest("GET", "http://localhost/api/admin/line/check-block?patient_id=P002");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.blocked).toBe(true);
  });

  it("ブロック時にログ記録される", async () => {
    mockChain.maybeSingle
      .mockResolvedValueOnce({ data: { line_id: "U_LINE_003" }, error: null })
      // 最新イベント: null（記録なし）→ INSERT 実行
      .mockResolvedValueOnce({ data: null, error: null });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    mockChain.insert.mockReturnValue({ data: null, error: null });

    const req = createMockRequest("GET", "http://localhost/api/admin/line/check-block?patient_id=P003");
    await GET(req);

    // message_log への insert が呼ばれることを確認
    const fromMock = (supabaseAdmin.from as any);
    const fromCalls = fromMock.mock.calls.map((c: any[]) => c[0]);
    expect(fromCalls).toContain("message_log");

    const insertCalls = mockChain.insert.mock.calls;
    const logInsert = insertCalls.find((c: any[]) =>
      c[0]?.event_type === "unfollow"
    );
    expect(logInsert).toBeTruthy();
    expect(logInsert[0].direction).toBe("incoming");
    expect(logInsert[0].content).toContain("ブロック");
  });

  it("既にunfollow記録済み → 重複INSERT回避", async () => {
    mockChain.maybeSingle
      .mockResolvedValueOnce({ data: { line_id: "U_LINE_004" }, error: null })
      // 最新イベント: unfollow（既に記録済み）
      .mockResolvedValueOnce({ data: { id: 99, event_type: "unfollow" }, error: null });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const req = createMockRequest("GET", "http://localhost/api/admin/line/check-block?patient_id=P004");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.blocked).toBe(true);

    // insert が呼ばれていないことを確認
    const insertCalls = mockChain.insert.mock.calls;
    const logInsert = insertCalls.find((c: any[]) =>
      c[0]?.event_type === "unfollow"
    );
    expect(logInsert).toBeUndefined();
  });

  it("LINE IDなし → {blocked:false, no_line_id:true}", async () => {
    // patients テーブルから line_id=null
    mockChain.maybeSingle
      .mockResolvedValueOnce({ data: { line_id: null }, error: null });

    const req = createMockRequest("GET", "http://localhost/api/admin/line/check-block?patient_id=P005");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.blocked).toBe(false);
    expect(json.no_line_id).toBe(true);
  });

  it("patient_id 未指定 → 400", async () => {
    const req = createMockRequest("GET", "http://localhost/api/admin/line/check-block");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("patient_id");
  });

  it("認証NG → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("GET", "http://localhost/api/admin/line/check-block?patient_id=P006");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("LINE_ACCESS_TOKEN なし → {blocked:false}", async () => {
    mockGetSettingOrEnv.mockResolvedValue("");
    mockChain.maybeSingle
      .mockResolvedValueOnce({ data: { line_id: "U_LINE_007" }, error: null });

    const req = createMockRequest("GET", "http://localhost/api/admin/line/check-block?patient_id=P007");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.blocked).toBe(false);
  });
});
