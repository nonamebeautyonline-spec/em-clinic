// __tests__/api/intake-list.test.ts
// intake一覧取得 API のテスト
// 対象: app/api/intake/list/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンモック ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

function createMockRequest(method: string, url: string, body?: any) {
  return {
    method,
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
  } as any;
}

import { GET } from "@/app/api/intake/list/route";
import { verifyAdminAuth } from "@/lib/admin-auth";

describe("intake一覧API (intake/list/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    (verifyAdminAuth as any).mockResolvedValue(true);
  });

  // ========================================
  // 認証テスト
  // ========================================
  it("認証失敗 → 401", async () => {
    (verifyAdminAuth as any).mockResolvedValue(false);
    const req = createMockRequest("GET", "http://localhost/api/intake/list");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  // ========================================
  // 日付指定あり
  // ========================================
  describe("日付範囲指定あり", () => {
    it("有効な予約がない → 空の rows", async () => {
      // reservations: 空（有効な予約なし）
      tableChains["reservations"] = createChain({ data: [], error: null });

      const req = createMockRequest("GET", "http://localhost/api/intake/list?from=2026-02-01&to=2026-02-28");
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.rows).toEqual([]);
    });

    it("予約あり + intake あり → 正規化された rows", async () => {
      // reservations
      tableChains["reservations"] = createChain({
        data: [
          { reserve_id: "r1", reserved_date: "2026-02-10", reserved_time: "10:00", prescription_menu: "AGA", patient_id: "p1", status: "confirmed" },
        ],
        error: null,
      });
      // intake
      tableChains["intake"] = createChain({
        data: [
          {
            id: 1, patient_id: "p1", reserve_id: "r1", answerer_id: "ans1",
            status: "OK", note: "メモ", answers: { age: "30" },
            created_at: "2026-02-10T00:00:00Z", call_status: "", call_status_updated_at: "",
          },
        ],
        error: null,
      });
      // patients
      tableChains["patients"] = createChain({
        data: [{ patient_id: "p1", name: "田中太郎", line_id: "U001", tel: "09012345678" }],
        error: null,
      });

      const req = createMockRequest("GET", "http://localhost/api/intake/list?from=2026-02-01&to=2026-02-28");
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.rows).toHaveLength(1);
      // 正規化されたフィールドの確認
      const row = json.rows[0];
      expect(row.patient_name).toBe("田中太郎");
      expect(row.reserved_date).toBe("2026-02-10");
      expect(row.reserved_time).toBe("10:00");
      expect(row.prescription_menu).toBe("AGA");
      expect(row.tel).toBe("09012345678");
      expect(row.age).toBe("30"); // answersのスプレッド
    });

    it("intake クエリエラー → 500", async () => {
      // reservations: 有効な予約あり
      tableChains["reservations"] = createChain({
        data: [{ reserve_id: "r1", reserved_date: "2026-02-10", reserved_time: "10:00", prescription_menu: "AGA", patient_id: "p1", status: "confirmed" }],
        error: null,
      });
      // intake: エラー
      tableChains["intake"] = createChain({ data: null, error: { message: "DB error" } });

      const req = createMockRequest("GET", "http://localhost/api/intake/list?from=2026-02-01&to=2026-02-28");
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(500);
      expect(json.ok).toBe(false);
      expect(json.error).toBe("DB_ERROR");
    });
  });

  // ========================================
  // 日付指定なし
  // ========================================
  describe("日付範囲指定なし", () => {
    it("intake全件取得 + 予約・患者情報結合", async () => {
      // intake
      tableChains["intake"] = createChain({
        data: [
          {
            id: 1, patient_id: "p1", reserve_id: "r1", answerer_id: null,
            status: "OK", note: "", answers: {},
            created_at: "2026-02-10T00:00:00Z", call_status: null, call_status_updated_at: null,
          },
        ],
        error: null,
      });
      // reservations
      tableChains["reservations"] = createChain({
        data: [{ reserve_id: "r1", reserved_date: "2026-02-10", reserved_time: "14:00", prescription_menu: "ED", status: "confirmed" }],
        error: null,
      });
      // patients
      tableChains["patients"] = createChain({
        data: [{ patient_id: "p1", name: "山田花子", line_id: null, tel: "08011112222" }],
        error: null,
      });

      const req = createMockRequest("GET", "http://localhost/api/intake/list");
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.rows).toHaveLength(1);
      expect(json.rows[0].patient_name).toBe("山田花子");
      expect(json.rows[0].reserved_time).toBe("14:00");
    });

    it("intake クエリエラー → 500", async () => {
      tableChains["intake"] = createChain({ data: null, error: { message: "query failed" } });

      const req = createMockRequest("GET", "http://localhost/api/intake/list");
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(500);
      expect(json.ok).toBe(false);
    });

    it("intakeデータなし → 空の rows", async () => {
      tableChains["intake"] = createChain({ data: [], error: null });

      const req = createMockRequest("GET", "http://localhost/api/intake/list");
      const res = await GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.rows).toEqual([]);
    });
  });

  // ========================================
  // 患者名の優先順位
  // ========================================
  it("answersのnameよりpatientsテーブルの名前が優先される", async () => {
    tableChains["intake"] = createChain({
      data: [
        {
          id: 1, patient_id: "p1", reserve_id: null, answerer_id: null,
          status: null, note: null, answers: { name: "旧名前" },
          created_at: "2026-02-01T00:00:00Z", call_status: null, call_status_updated_at: null,
        },
      ],
      error: null,
    });
    tableChains["patients"] = createChain({
      data: [{ patient_id: "p1", name: "正式名前", line_id: null, tel: "" }],
      error: null,
    });

    const req = createMockRequest("GET", "http://localhost/api/intake/list");
    const res = await GET(req);
    const json = await res.json();
    // patient_name は patients テーブルの値で上書き
    expect(json.rows[0].patient_name).toBe("正式名前");
    expect(json.rows[0].name).toBe("正式名前");
  });
});
