// __tests__/api/admin-delete-patient-data.test.ts
// 患者データ削除 API のテスト
// 対象: app/api/admin/delete-patient-data/route.ts
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

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

// parseBody をモック
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
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

import { POST, GET } from "@/app/api/admin/delete-patient-data/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";
import { invalidateDashboardCache } from "@/lib/redis";
import { logAudit } from "@/lib/audit";

describe("患者データ削除API (delete-patient-data/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    (verifyAdminAuth as any).mockResolvedValue(true);
  });

  // ========================================
  // POST: データ削除
  // ========================================
  describe("POST: 患者データ削除", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("POST", "http://localhost/api/admin/delete-patient-data");
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("バリデーション失敗 → parseBody のエラーレスポンス", async () => {
      const mockErrorResponse = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), { status: 400 });
      (parseBody as any).mockResolvedValue({ error: mockErrorResponse });

      const req = createMockRequest("POST", "http://localhost/api/admin/delete-patient-data");
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("予約キャンセル + 問診削除 → 成功", async () => {
      (parseBody as any).mockResolvedValue({
        data: { patient_id: "p1", delete_intake: true, delete_reservation: true },
      });

      // 予約取得（有効な予約あり）
      const reservationsChain = createChain({
        data: [{ id: 1, reserve_id: "r1", reserved_date: "2026-02-10", reserved_time: "10:00", status: "confirmed" }],
        error: null,
      });
      // 予約キャンセル更新
      const reservationUpdateChain = createChain({ data: null, error: null });
      // intake 削除
      const intakeChain = createChain({ data: null, error: null });

      // テーブルチェーンのセットアップ
      // reservations は selectとupdateの両方で使われるので、
      // 最初のselect呼び出しではデータを返し、update呼び出しではエラーなし
      tableChains["reservations"] = createChain({
        data: [{ id: 1, reserve_id: "r1", reserved_date: "2026-02-10", reserved_time: "10:00", status: "confirmed" }],
        error: null,
      });
      tableChains["intake"] = createChain({ data: null, error: null });

      const req = createMockRequest("POST", "http://localhost/api/admin/delete-patient-data");
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.reservation_canceled).toBe(true);
      expect(json.intake_deleted).toBe(true);
      expect(invalidateDashboardCache).toHaveBeenCalledWith("p1");
      expect(logAudit).toHaveBeenCalled();
    });

    it("予約なし → reservation_canceled なし", async () => {
      (parseBody as any).mockResolvedValue({
        data: { patient_id: "p1", delete_intake: false, delete_reservation: true },
      });

      // 予約取得: 空
      tableChains["reservations"] = createChain({ data: [], error: null });

      const req = createMockRequest("POST", "http://localhost/api/admin/delete-patient-data");
      const res = await POST(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.reservation_canceled).toBeUndefined();
    });

    it("予約取得エラー → errors に追加", async () => {
      (parseBody as any).mockResolvedValue({
        data: { patient_id: "p1", delete_intake: false, delete_reservation: true },
      });

      tableChains["reservations"] = createChain({ data: null, error: { message: "fetch error" } });

      const req = createMockRequest("POST", "http://localhost/api/admin/delete-patient-data");
      const res = await POST(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.errors).toContain("予約取得エラー: fetch error");
    });

    it("問診削除エラー → errors に追加", async () => {
      (parseBody as any).mockResolvedValue({
        data: { patient_id: "p1", delete_intake: true, delete_reservation: false },
      });

      tableChains["intake"] = createChain({ data: null, error: { message: "delete error" } });

      const req = createMockRequest("POST", "http://localhost/api/admin/delete-patient-data");
      const res = await POST(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.errors).toContain("問診削除エラー: delete error");
    });

    it("delete_reservation=false → 予約キャンセルスキップ", async () => {
      (parseBody as any).mockResolvedValue({
        data: { patient_id: "p1", delete_intake: false, delete_reservation: false },
      });

      const req = createMockRequest("POST", "http://localhost/api/admin/delete-patient-data");
      const res = await POST(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      // reservations テーブルにはアクセスしない
    });
  });

  // ========================================
  // GET: 患者情報取得
  // ========================================
  describe("GET: 患者情報取得", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/delete-patient-data?patient_id=p1");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("patient_id なし → 400", async () => {
      const req = createMockRequest("GET", "http://localhost/api/admin/delete-patient-data");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("patient_id required");
    });

    it("正常取得 → 予約・患者名・問診を返す", async () => {
      // Promise.all で3つの並列クエリが実行される
      // reservations
      tableChains["reservations"] = createChain({
        data: [{ id: 1, reserve_id: "r1", reserved_date: "2026-02-10", reserved_time: "10:00", status: "confirmed", patient_name: "田中" }],
        error: null,
      });
      // patients
      tableChains["patients"] = createChain({
        data: { name: "田中太郎" },
        error: null,
      });
      // intake
      tableChains["intake"] = createChain({
        data: { id: 1, reserve_id: "r1", created_at: "2026-02-10T00:00:00Z" },
        error: null,
      });

      const req = createMockRequest("GET", "http://localhost/api/admin/delete-patient-data?patient_id=p1");
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.patient_name).toBe("田中太郎");
      expect(json.reservations).toHaveLength(1);
    });
  });
});
