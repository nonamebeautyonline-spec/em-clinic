// __tests__/api/kartelist.test.ts
// カルテ一覧API（203行）のテスト
// 対象: app/api/admin/kartelist/route.ts
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
const intakeChain = createChain();
const patientsChain = createChain();
const reservationsChain = createChain();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      switch (table) {
        case "intake": return intakeChain;
        case "patients": return patientsChain;
        case "reservations": return reservationsChain;
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
    url,
    nextUrl: { searchParams: parsedUrl.searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
  } as any;
}

import { GET } from "@/app/api/admin/kartelist/route";
import { verifyAdminAuth } from "@/lib/admin-auth";

describe("カルテ一覧API (kartelist/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (verifyAdminAuth as any).mockResolvedValue(true);

    // 全チェーンリセット
    [intakeChain, patientsChain, reservationsChain].forEach(chain => {
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
      const req = createMockRequest("http://localhost/api/admin/kartelist");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });
  });

  // === 正常系: 基本取得 ===
  describe("正常系: 基本取得", () => {
    it("パラメータなし → page=1, limit=100 でデフォルト取得", async () => {
      const req = createMockRequest("http://localhost/api/admin/kartelist");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.items).toEqual([]);
      expect(json.total).toBe(0);
      expect(json.page).toBe(1);
      expect(json.limit).toBe(100);
    });

    it("page/limit 指定 → 正しくパラメータが反映される", async () => {
      const req = createMockRequest("http://localhost/api/admin/kartelist?page=2&limit=50");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.page).toBe(2);
      expect(json.limit).toBe(50);
    });

    it("limit が最大200を超えない", async () => {
      const req = createMockRequest("http://localhost/api/admin/kartelist?limit=500");
      const res = await GET(req);
      const json = await res.json();
      expect(json.limit).toBe(200);
    });

    it("limit が最小1を下回らない", async () => {
      const req = createMockRequest("http://localhost/api/admin/kartelist?limit=0");
      const res = await GET(req);
      const json = await res.json();
      expect(json.limit).toBe(1);
    });

    it("page が最小1を下回らない", async () => {
      const req = createMockRequest("http://localhost/api/admin/kartelist?page=0");
      const res = await GET(req);
      const json = await res.json();
      expect(json.page).toBe(1);
    });
  });

  // === データあり ===
  describe("データあり: intake + patients + reservations の統合", () => {
    it("intake→patients→reservations の3段階取得が正しくマージされる", async () => {
      // intakeデータ（countクエリ用 + データクエリ用で2回呼ばれる）
      // count用のthen
      let callCount = 0;
      intakeChain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount <= 1) {
          // count クエリ
          return resolve({ data: null, error: null, count: 2 });
        }
        // データクエリ
        return resolve({
          data: [
            { id: 101, patient_id: "p-001", reserve_id: "res-001", created_at: "2026-02-23T10:00:00Z", updated_at: "2026-02-23T10:30:00Z", status: "OK", note: "カルテメモ" },
            { id: 102, patient_id: "p-002", reserve_id: "res-002", created_at: "2026-02-22T09:00:00Z", updated_at: "2026-02-22T09:30:00Z", status: null, note: null },
          ],
          error: null,
          count: 2,
        });
      });

      patientsChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { patient_id: "p-001", name: "患者A", tel: "09011111111", sex: "male", birthday: "1990-01-01" },
          { patient_id: "p-002", name: "患者B", tel: "09022222222", sex: "female", birthday: "1985-06-15" },
        ],
        error: null,
      }));

      reservationsChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { reserve_id: "res-001", reserved_date: "2026-02-23", reserved_time: "10:00", prescription_menu: "マンジャロ 2.5mg" },
          { reserve_id: "res-002", reserved_date: "2026-02-22", reserved_time: "09:00", prescription_menu: "マンジャロ 5mg" },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/kartelist");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.ok).toBe(true);
      expect(json.items).toHaveLength(2);

      // 予約日時の降順でソートされる（2026-02-23 > 2026-02-22）
      const item0 = json.items[0]; // 2026-02-23
      expect(item0.patientId).toBe("p-001");
      expect(item0.patientName).toBe("患者A");
      expect(item0.tel).toBe("09011111111");
      expect(item0.sex).toBe("male");
      expect(item0.birthday).toBe("1990-01-01");
      expect(item0.reservedDate).toBe("2026-02-23");
      expect(item0.reservedTime).toBe("10:00");
      expect(item0.status).toBe("OK");
      expect(item0.prescriptionMenu).toBe("マンジャロ 2.5mg");
      expect(item0.hasNote).toBe(true);

      const item1 = json.items[1]; // 2026-02-22
      expect(item1.patientName).toBe("患者B");
      expect(item1.hasNote).toBe(false);
    });
  });

  // === 検索テスト ===
  describe("検索（q パラメータ）", () => {
    it("名前検索で一致 → 該当患者のカルテのみ返却", async () => {
      // patients検索結果
      let patientCallCount = 0;
      patientsChain.then = vi.fn((resolve: any) => {
        patientCallCount++;
        if (patientCallCount === 1) {
          // 名前検索ヒット
          return resolve({
            data: [{ patient_id: "p-search", name: "検索太郎" }],
            error: null,
          });
        }
        // 追加情報取得
        return resolve({
          data: [{ patient_id: "p-search", name: "検索太郎", tel: "09033333333", sex: "male", birthday: "1995-03-03" }],
          error: null,
        });
      });

      // patient_id 直接検索結果
      let intakeCallCount = 0;
      intakeChain.then = vi.fn((resolve: any) => {
        intakeCallCount++;
        if (intakeCallCount === 1) {
          // patient_id 直接検索
          return resolve({ data: [], error: null });
        }
        if (intakeCallCount === 2) {
          // count クエリ
          return resolve({ data: null, error: null, count: 1 });
        }
        // データクエリ
        return resolve({
          data: [
            { id: 201, patient_id: "p-search", reserve_id: "res-s1", created_at: "2026-02-20T08:00:00Z", updated_at: "2026-02-20T08:30:00Z", status: "OK", note: "検索結果" },
          ],
          error: null,
        });
      });

      reservationsChain.then = vi.fn((resolve: any) => resolve({
        data: [{ reserve_id: "res-s1", reserved_date: "2026-02-20", reserved_time: "08:00", prescription_menu: "" }],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/kartelist?q=検索太郎");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("検索結果0件 → 空配列", async () => {
      // 名前検索ヒットなし
      patientsChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));
      // patient_id 直接検索もヒットなし
      intakeChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

      const req = createMockRequest("http://localhost/api/admin/kartelist?q=存在しない名前");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.items).toEqual([]);
      expect(json.total).toBe(0);
    });
  });

  // === date フィルタ ===
  describe("date フィルタ", () => {
    it("date パラメータ指定 → 予約日でフィルタリング", async () => {
      // reservationsから対象日のpatient_idを取得（count用 + data用で2回）
      let resvCallCount = 0;
      reservationsChain.then = vi.fn((resolve: any) => {
        resvCallCount++;
        if (resvCallCount <= 2) {
          // count用 + data用のreservationsクエリ
          return resolve({
            data: [{ patient_id: "p-date", reserve_id: "res-d1", reserved_date: "2026-02-23", reserved_time: "15:00", prescription_menu: "" }],
            error: null,
          });
        }
        // reserveId取得
        return resolve({
          data: [{ reserve_id: "res-d1", reserved_date: "2026-02-23", reserved_time: "15:00", prescription_menu: "マンジャロ 7.5mg" }],
          error: null,
        });
      });

      let intakeCallCount = 0;
      intakeChain.then = vi.fn((resolve: any) => {
        intakeCallCount++;
        if (intakeCallCount === 1) {
          return resolve({ data: null, error: null, count: 1 });
        }
        return resolve({
          data: [{ id: 301, patient_id: "p-date", reserve_id: "res-d1", created_at: "2026-02-20T00:00:00Z", updated_at: "2026-02-23T15:00:00Z", status: "OK", note: "日付フィルタ" }],
          error: null,
        });
      });

      patientsChain.then = vi.fn((resolve: any) => resolve({
        data: [{ patient_id: "p-date", name: "日付太郎", tel: "09044444444", sex: "male", birthday: "2000-12-25" }],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/kartelist?date=2026-02-23");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("date指定で予約が0件 → 空配列", async () => {
      reservationsChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

      const req = createMockRequest("http://localhost/api/admin/kartelist?date=2026-12-31");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.items).toEqual([]);
      expect(json.total).toBe(0);
    });
  });

  // === DBエラー ===
  describe("DBエラー", () => {
    it("intakeデータ取得エラー → 500", async () => {
      intakeChain.then = vi.fn((resolve: any) => resolve({
        data: null,
        error: { message: "Database connection error" },
      }));

      const req = createMockRequest("http://localhost/api/admin/kartelist");
      const res = await GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });
  });

  // === レスポンスフィールド確認 ===
  describe("レスポンスフィールド", () => {
    it("items の各フィールドが正しい型を持つ", async () => {
      let callCount = 0;
      intakeChain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount <= 1) {
          return resolve({ data: null, error: null, count: 1 });
        }
        return resolve({
          data: [{ id: 501, patient_id: "p-type", reserve_id: null, created_at: "2026-02-01T00:00:00Z", updated_at: null, status: null, note: null }],
          error: null,
        });
      });

      const req = createMockRequest("http://localhost/api/admin/kartelist");
      const res = await GET(req);
      const json = await res.json();

      const item = json.items[0];
      expect(typeof item.id).toBe("number");
      expect(typeof item.patientId).toBe("string");
      expect(typeof item.patientName).toBe("string");
      expect(typeof item.hasNote).toBe("boolean");
      expect(item.hasNote).toBe(false);
      expect(item.status).toBeNull();
    });
  });
});
