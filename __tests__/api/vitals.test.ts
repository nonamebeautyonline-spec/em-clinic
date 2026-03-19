// __tests__/api/vitals.test.ts
// バイタルサインAPI (GET/POST) のテスト
// 対象: app/api/admin/vitals/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
interface ChainResult { data: unknown; error: unknown }
interface SupabaseChain extends Record<string, ReturnType<typeof vi.fn>> {
  then: ReturnType<typeof vi.fn>;
}

function createChain(defaultResolve: ChainResult = { data: [], error: null }): SupabaseChain {
  const chain = {} as SupabaseChain;
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "from",
  ].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (value: ChainResult) => unknown) => resolve(defaultResolve));
  return chain;
}

const vitalsChain = createChain();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "patient_vitals") return vitalsChain;
      return createChain();
    }),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant-id"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant-id"),
  withTenant: vi.fn(<T>(q: T) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn((tid: string | null) => ({ tenant_id: tid || "00000000-0000-0000-0000-000000000001" })),
}));

// NextRequest互換のモック
function createMockGetRequest(url: string) {
  const parsedUrl = new URL(url);
  return {
    method: "GET",
    url,
    nextUrl: { searchParams: parsedUrl.searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
  } as unknown as import("next/server").NextRequest;
}

function createMockPostRequest(body: unknown) {
  return {
    method: "POST",
    url: "https://example.com/api/admin/vitals",
    json: vi.fn().mockResolvedValue(body),
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
  } as unknown as import("next/server").NextRequest;
}

// チェーンリセットヘルパー
function resetChain(chain: SupabaseChain, defaultResolve: ChainResult = { data: [], error: null }) {
  chain.then = vi.fn((resolve: (value: ChainResult) => unknown) => resolve(defaultResolve));
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
}

import { GET, POST } from "@/app/api/admin/vitals/route";
import { verifyAdminAuth } from "@/lib/admin-auth";

describe("バイタルAPI (vitals/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);
    resetChain(vitalsChain);
  });

  // ========================================
  // GET テスト
  // ========================================
  describe("GET /api/admin/vitals", () => {
    it("認証なしで401を返す", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValue(false);
      const req = createMockGetRequest("https://example.com/api/admin/vitals?patient_id=P001");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("patient_id なしで400を返す", async () => {
      const req = createMockGetRequest("https://example.com/api/admin/vitals");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain("patient_id");
    });

    it("正常にバイタル一覧を返す", async () => {
      const mockVitals = [
        {
          id: "v1",
          patient_id: "P001",
          tenant_id: "test-tenant-id",
          measured_at: "2026-03-05T10:00:00Z",
          weight_kg: 65.0,
          height_cm: 170.0,
          bmi: 22.5,
          systolic_bp: 120,
          diastolic_bp: 80,
          pulse: 72,
          temperature: 36.5,
          spo2: 98,
          respiratory_rate: 16,
          waist_cm: 85.0,
          notes: null,
        },
      ];
      resetChain(vitalsChain, { data: mockVitals, error: null });

      const req = createMockGetRequest("https://example.com/api/admin/vitals?patient_id=P001");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.vitals).toHaveLength(1);
      expect(body.vitals[0].weight_kg).toBe(65.0);
    });

    it("データなしで空配列を返す", async () => {
      resetChain(vitalsChain, { data: [], error: null });

      const req = createMockGetRequest("https://example.com/api/admin/vitals?patient_id=P999");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.vitals).toEqual([]);
    });

    it("テーブル未作成時に空配列を返す", async () => {
      resetChain(vitalsChain, {
        data: null,
        error: { message: 'relation "patient_vitals" does not exist' },
      });

      const req = createMockGetRequest("https://example.com/api/admin/vitals?patient_id=P001");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.vitals).toEqual([]);
    });

    it("DBエラー時に500を返す", async () => {
      resetChain(vitalsChain, {
        data: null,
        error: { message: "connection timeout" },
      });

      const req = createMockGetRequest("https://example.com/api/admin/vitals?patient_id=P001");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // POST テスト
  // ========================================
  describe("POST /api/admin/vitals", () => {
    it("認証なしで401を返す", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValue(false);
      const req = createMockPostRequest({ patient_id: "P001", weight_kg: 65 });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("patient_id なしでバリデーションエラー", async () => {
      const req = createMockPostRequest({ weight_kg: 65 });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("正常にバイタルを保存する", async () => {
      const mockInserted = {
        id: "v-new",
        patient_id: "P001",
        tenant_id: "test-tenant-id",
        weight_kg: 65.0,
        height_cm: 170.0,
        bmi: 22.5,
        systolic_bp: 120,
        diastolic_bp: 80,
        pulse: 72,
        temperature: 36.5,
        spo2: 98,
        measured_at: "2026-03-05T10:00:00Z",
      };
      resetChain(vitalsChain, { data: mockInserted, error: null });

      const req = createMockPostRequest({
        patient_id: "P001",
        weight_kg: 65.0,
        height_cm: 170.0,
        systolic_bp: 120,
        diastolic_bp: 80,
        pulse: 72,
        temperature: 36.5,
        spo2: 98,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.vital).toBeDefined();
      expect(body.vital.patient_id).toBe("P001");
    });

    it("体温が範囲外でバリデーションエラー", async () => {
      const req = createMockPostRequest({
        patient_id: "P001",
        temperature: 50.0, // max 45
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("SpO2が範囲外でバリデーションエラー", async () => {
      const req = createMockPostRequest({
        patient_id: "P001",
        spo2: 150, // max 100
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("血圧が範囲外でバリデーションエラー", async () => {
      const req = createMockPostRequest({
        patient_id: "P001",
        systolic_bp: 500, // max 400
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("メモのみでも保存可能", async () => {
      const mockInserted = {
        id: "v-note",
        patient_id: "P001",
        tenant_id: "test-tenant-id",
        notes: "特記事項あり",
        measured_at: "2026-03-05T10:00:00Z",
      };
      resetChain(vitalsChain, { data: mockInserted, error: null });

      const req = createMockPostRequest({
        patient_id: "P001",
        notes: "特記事項あり",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("DBエラー時に500を返す", async () => {
      resetChain(vitalsChain, {
        data: null,
        error: { message: "insert failed" },
      });

      const req = createMockPostRequest({
        patient_id: "P001",
        weight_kg: 65.0,
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // Zodスキーマテスト
  // ========================================
  describe("vitalCreateSchema バリデーション", () => {
    it("最小限のデータ（patient_idのみ）でパスする", async () => {
      const { vitalCreateSchema } = await import("@/lib/validations/vitals");
      const result = vitalCreateSchema.safeParse({ patient_id: "P001" });
      expect(result.success).toBe(true);
    });

    it("全フィールド入力でパスする", async () => {
      const { vitalCreateSchema } = await import("@/lib/validations/vitals");
      const result = vitalCreateSchema.safeParse({
        patient_id: "P001",
        intake_id: 12345,
        measured_at: "2026-03-05T10:00:00Z",
        weight_kg: 65.0,
        height_cm: 170.0,
        bmi: 22.5,
        systolic_bp: 120,
        diastolic_bp: 80,
        pulse: 72,
        temperature: 36.5,
        spo2: 98,
        respiratory_rate: 16,
        waist_cm: 85.0,
        notes: "テストメモ",
      });
      expect(result.success).toBe(true);
    });

    it("patient_idが空文字でエラー", async () => {
      const { vitalCreateSchema } = await import("@/lib/validations/vitals");
      const result = vitalCreateSchema.safeParse({ patient_id: "" });
      expect(result.success).toBe(false);
    });

    it("体重が負数でエラー", async () => {
      const { vitalCreateSchema } = await import("@/lib/validations/vitals");
      const result = vitalCreateSchema.safeParse({ patient_id: "P001", weight_kg: -1 });
      expect(result.success).toBe(false);
    });

    it("体重が500超でエラー", async () => {
      const { vitalCreateSchema } = await import("@/lib/validations/vitals");
      const result = vitalCreateSchema.safeParse({ patient_id: "P001", weight_kg: 501 });
      expect(result.success).toBe(false);
    });

    it("身長が300超でエラー", async () => {
      const { vitalCreateSchema } = await import("@/lib/validations/vitals");
      const result = vitalCreateSchema.safeParse({ patient_id: "P001", height_cm: 301 });
      expect(result.success).toBe(false);
    });

    it("体温30未満でエラー", async () => {
      const { vitalCreateSchema } = await import("@/lib/validations/vitals");
      const result = vitalCreateSchema.safeParse({ patient_id: "P001", temperature: 29.9 });
      expect(result.success).toBe(false);
    });

    it("体温45超でエラー", async () => {
      const { vitalCreateSchema } = await import("@/lib/validations/vitals");
      const result = vitalCreateSchema.safeParse({ patient_id: "P001", temperature: 45.1 });
      expect(result.success).toBe(false);
    });

    it("SpO2が小数でエラー", async () => {
      const { vitalCreateSchema } = await import("@/lib/validations/vitals");
      const result = vitalCreateSchema.safeParse({ patient_id: "P001", spo2: 98.5 });
      expect(result.success).toBe(false);
    });

    it("脈拍が300超でエラー", async () => {
      const { vitalCreateSchema } = await import("@/lib/validations/vitals");
      const result = vitalCreateSchema.safeParse({ patient_id: "P001", pulse: 301 });
      expect(result.success).toBe(false);
    });

    it("メモが500文字超でエラー", async () => {
      const { vitalCreateSchema } = await import("@/lib/validations/vitals");
      const result = vitalCreateSchema.safeParse({ patient_id: "P001", notes: "a".repeat(501) });
      expect(result.success).toBe(false);
    });

    it("intake_idが文字列でエラー", async () => {
      const { vitalCreateSchema } = await import("@/lib/validations/vitals");
      const result = vitalCreateSchema.safeParse({ patient_id: "P001", intake_id: "not-a-number" });
      expect(result.success).toBe(false);
    });
  });
});
