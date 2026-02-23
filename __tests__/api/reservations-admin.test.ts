// __tests__/api/reservations-admin.test.ts
// 管理者用予約一覧API（265行）のテスト
// 対象: app/api/admin/reservations/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーン生成ヘルパー ---
function createChain(defaultResolve = { data: [], error: null, count: 0 }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

// テーブルごとにチェーンを管理
const reservationsChain = createChain();
const patientsChain = createChain();
const intakeChain = createChain();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      switch (table) {
        case "reservations": return reservationsChain;
        case "patients": return patientsChain;
        case "intake": return intakeChain;
        default: return createChain();
      }
    }),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
}));

// NextRequest互換のモック
function createMockRequest(url: string) {
  const parsedUrl = new URL(url);
  return {
    method: "GET",
    nextUrl: { searchParams: parsedUrl.searchParams },
    url,
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
  } as any;
}

import { GET } from "@/app/api/admin/reservations/route";
import { verifyAdminAuth } from "@/lib/admin-auth";

describe("管理者用予約一覧API (admin/reservations/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (verifyAdminAuth as any).mockResolvedValue(true);

    // 全チェーンリセット
    [reservationsChain, patientsChain, intakeChain].forEach(chain => {
      chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null, count: 0 }));
      [
        "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
        "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
        "ilike", "or", "count", "csv",
      ].forEach(m => {
        chain[m] = vi.fn().mockReturnValue(chain);
      });
    });
  });

  // === 認証テスト ===
  describe("認証", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("http://localhost/api/admin/reservations");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });
  });

  // === デフォルト（今日の予約）===
  describe("デフォルト: 今日の予約取得", () => {
    it("パラメータ無し → 今日の予約を取得", async () => {
      reservationsChain.then = vi.fn((resolve: any) => resolve({
        data: [
          {
            id: "r1",
            reserve_id: "res-001",
            patient_id: "p-001",
            patient_name: "テスト太郎",
            reserved_date: "2026-02-23",
            reserved_time: "10:00",
            status: "pending",
            prescription_menu: "マンジャロ 2.5mg",
          },
        ],
        error: null,
      }));

      patientsChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { patient_id: "p-001", name: "テスト太郎", name_kana: "テストタロウ", tel: "09012345678", sex: "male", birthday: "1990-01-01", line_id: "U001" },
        ],
        error: null,
      }));

      intakeChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { reserve_id: "res-001", call_status: "called", note: "メモ", answerer_id: "lstep-001", status: "OK" },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/reservations");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reservations).toBeDefined();
      expect(Array.isArray(json.reservations)).toBe(true);
    });

    it("date パラメータ指定 → 指定日の予約を取得", async () => {
      const req = createMockRequest("http://localhost/api/admin/reservations?date=2026-02-20");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reservations).toBeDefined();
    });

    it("予約データ空 → reservations空配列", async () => {
      const req = createMockRequest("http://localhost/api/admin/reservations");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reservations).toEqual([]);
    });
  });

  // === created_date モード ===
  describe("created_date モード: 予約取得日で絞り込み", () => {
    it("created_date 指定 → 正常取得", async () => {
      reservationsChain.then = vi.fn((resolve: any) => resolve({
        data: [
          {
            id: "r1",
            reserve_id: "res-002",
            patient_id: "p-002",
            patient_name: "作成太郎",
            reserved_date: "2026-02-25",
            reserved_time: "14:00",
            status: "pending",
            prescription_menu: "",
            created_at: "2026-02-23T10:00:00Z",
          },
        ],
        error: null,
      }));

      patientsChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { patient_id: "p-002", name: "作成太郎", name_kana: "サクセイタロウ", sex: "male", birthday: "1985-05-05" },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/reservations?created_date=2026-02-23");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.created_date).toBe("2026-02-23");
      expect(json.reservations).toBeDefined();
    });

    it("created_date のレスポンスに patient情報がマージされる", async () => {
      reservationsChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { id: "r1", reserve_id: "res-003", patient_id: "p-003", reserved_date: "2026-02-25", reserved_time: "09:00", status: "pending", created_at: "2026-02-23T05:00:00Z" },
        ],
        error: null,
      }));

      patientsChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { patient_id: "p-003", name: "患者名", name_kana: "カンジャメイ", sex: "female", birthday: "1992-03-15" },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/reservations?created_date=2026-02-23");
      const res = await GET(req);
      const json = await res.json();
      expect(json.reservations[0].patient_kana).toBe("カンジャメイ");
      expect(json.reservations[0].patient_sex).toBe("female");
      expect(json.reservations[0].patient_birthday).toBe("1992-03-15");
    });

    it("created_date 不正形式 → デフォルトモードへフォールスルー", async () => {
      const req = createMockRequest("http://localhost/api/admin/reservations?created_date=invalid");
      const res = await GET(req);
      // 不正形式の場合、created_dateの正規表現に一致しないのでスキップされ、
      // 次のfromParamもmonthParamもないのでデフォルト（今日）で取得
      expect(res.status).toBe(200);
    });
  });

  // === from モード ===
  describe("from モード: 指定日以降の予約を全取得", () => {
    it("from 指定 → 正常取得", async () => {
      reservationsChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { id: "r1", reserve_id: "res-f1", patient_id: "p-f1", patient_name: "未来太郎", reserved_date: "2026-03-01", reserved_time: "10:00", status: "pending" },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/reservations?from=2026-02-23");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.from).toBe("2026-02-23");
      expect(json.reservations).toBeDefined();
    });

    it("from 指定 → 空データでも正常レスポンス", async () => {
      const req = createMockRequest("http://localhost/api/admin/reservations?from=2026-12-01");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reservations).toEqual([]);
    });
  });

  // === month モード ===
  describe("month モード: 月指定", () => {
    it("month=2026-02 → 正常取得", async () => {
      reservationsChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { id: "r1", reserve_id: "res-m1", patient_id: "p-m1", patient_name: "月太郎", reserved_date: "2026-02-15", reserved_time: "11:00", status: "OK" },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/reservations?month=2026-02");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.month).toBe("2026-02");
    });

    it("month 不正形式 → 400", async () => {
      const req = createMockRequest("http://localhost/api/admin/reservations?month=invalid");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid month format");
    });

    it("month=2026-13（13月）→ 400", async () => {
      const req = createMockRequest("http://localhost/api/admin/reservations?month=2026-13");
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("month=2026-00（0月）→ 400", async () => {
      const req = createMockRequest("http://localhost/api/admin/reservations?month=2026-00");
      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });

  // === DBエラー時 ===
  describe("DBエラー時", () => {
    it("reservations取得でDBエラー → 500（デフォルトモード）", async () => {
      reservationsChain.then = vi.fn((resolve: any) => resolve({
        data: null,
        error: { message: "Connection timeout" },
      }));

      const req = createMockRequest("http://localhost/api/admin/reservations");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });

    it("reservations取得でDBエラー → 500（created_dateモード）", async () => {
      reservationsChain.then = vi.fn((resolve: any) => resolve({
        data: null,
        error: { message: "Connection timeout" },
      }));

      const req = createMockRequest("http://localhost/api/admin/reservations?created_date=2026-02-23");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });

    it("reservations取得でDBエラー → 500（fromモード）", async () => {
      reservationsChain.then = vi.fn((resolve: any) => resolve({
        data: null,
        error: { message: "Connection timeout" },
      }));

      const req = createMockRequest("http://localhost/api/admin/reservations?from=2026-02-23");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });

    it("reservations取得でDBエラー → 500（monthモード）", async () => {
      reservationsChain.then = vi.fn((resolve: any) => resolve({
        data: null,
        error: { message: "Connection timeout" },
      }));

      const req = createMockRequest("http://localhost/api/admin/reservations?month=2026-02");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  // === レスポンスフィールドの整形テスト ===
  describe("レスポンスフィールドの整形", () => {
    it("デフォルトモード: intake情報（call_status, note, lstep_uid）がマージされる", async () => {
      reservationsChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { id: "r1", reserve_id: "res-100", patient_id: "p-100", reserved_date: "2026-02-23", reserved_time: "15:00", status: "pending" },
        ],
        error: null,
      }));

      patientsChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { patient_id: "p-100", name: "整形太郎", name_kana: "セイケイタロウ", tel: "09099999999", sex: "male", birthday: "1988-08-08", line_id: "U100" },
        ],
        error: null,
      }));

      intakeChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { reserve_id: "res-100", call_status: "connected", note: "テストメモ", answerer_id: "lstep-100", status: "OK" },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/reservations");
      const res = await GET(req);
      const json = await res.json();

      const r = json.reservations[0];
      expect(r.patient_kana).toBe("セイケイタロウ");
      expect(r.phone).toBe("09099999999");
      expect(r.line_uid).toBe("U100");
      expect(r.lstep_uid).toBe("lstep-100");
      expect(r.call_status).toBe("connected");
      expect(r.note).toBe("テストメモ");
      expect(r.intake_status).toBe("OK");
    });
  });
});
