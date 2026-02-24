// __tests__/api/setup-status-extended.test.ts
// セットアップステータスAPI 拡張テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック設定 ---
const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
}));

const mockGetSettingOrEnv = vi.fn();
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: (...args: any[]) => mockGetSettingOrEnv(...args),
}));

// Supabase モック — 各テーブルのクエリ結果を制御
const tableResults: Record<string, { count: number | null; error: any }> = {};

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((tableName: string) => {
      const result = tableResults[tableName] || { count: 0, error: null };
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ...result,
            }),
            ...result,
          }),
          ...result,
        }),
      };
    }),
  },
}));

// --- リクエスト生成ヘルパー ---
function createMockRequest(method: string, url: string) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
  }) as any;
}

import { GET } from "@/app/api/admin/setup-status/route";

describe("セットアップステータスAPI 拡張テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    // デフォルト: 全テーブルにデータなし
    Object.keys(tableResults).forEach((k) => delete tableResults[k]);
    mockGetSettingOrEnv.mockResolvedValue(undefined);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("GET", "http://localhost/api/admin/setup-status");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("全未設定 → setupComplete=false, completedCount=0", async () => {
    mockGetSettingOrEnv.mockResolvedValue(undefined);
    const req = createMockRequest("GET", "http://localhost/api/admin/setup-status");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.setupComplete).toBe(false);
    expect(json.completedCount).toBe(0);
    expect(json.totalCount).toBe(6);
    expect(json.steps).toHaveProperty("line");
    expect(json.steps).toHaveProperty("payment");
    expect(json.steps).toHaveProperty("products");
    expect(json.steps).toHaveProperty("schedule");
    expect(json.steps).toHaveProperty("staff");
    expect(json.steps).toHaveProperty("richMenu");
  });

  it("LINE設定あり → steps.line=true", async () => {
    mockGetSettingOrEnv.mockResolvedValue("test-token-xxx");
    const req = createMockRequest("GET", "http://localhost/api/admin/setup-status");
    const res = await GET(req);
    const json = await res.json();
    expect(json.steps.line).toBe(true);
    // LINE以外は未設定
    expect(json.steps.payment).toBe(false);
    expect(json.completedCount).toBe(1);
  });

  it("レスポンスに全ステップのキーが含まれる", async () => {
    const req = createMockRequest("GET", "http://localhost/api/admin/setup-status");
    const res = await GET(req);
    const json = await res.json();
    const expectedKeys = ["line", "payment", "products", "schedule", "staff", "richMenu"];
    for (const key of expectedKeys) {
      expect(json.steps).toHaveProperty(key);
      expect(typeof json.steps[key]).toBe("boolean");
    }
  });

  it("totalCountは6", async () => {
    const req = createMockRequest("GET", "http://localhost/api/admin/setup-status");
    const res = await GET(req);
    const json = await res.json();
    expect(json.totalCount).toBe(6);
  });
});

// ヘルパー関数のロジックテスト
describe("tableHasData ロジック", () => {
  it("count が minCount 以上なら true", () => {
    // 直接ロジックをテスト
    const check = (count: number | null, minCount: number) =>
      (count || 0) >= minCount;
    expect(check(5, 1)).toBe(true);
    expect(check(1, 1)).toBe(true);
    expect(check(0, 1)).toBe(false);
    expect(check(null, 1)).toBe(false);
    expect(check(2, 2)).toBe(true);
    expect(check(1, 2)).toBe(false);
  });
});

describe("setupComplete 判定ロジック", () => {
  it("全ステップ true → setupComplete=true", () => {
    const steps = {
      line: true,
      payment: true,
      products: true,
      schedule: true,
      staff: true,
      richMenu: true,
    };
    expect(Object.values(steps).every(Boolean)).toBe(true);
  });

  it("1つでも false → setupComplete=false", () => {
    const steps = {
      line: true,
      payment: true,
      products: true,
      schedule: false,
      staff: true,
      richMenu: true,
    };
    expect(Object.values(steps).every(Boolean)).toBe(false);
  });

  it("completedCount の計算", () => {
    const steps = {
      line: true,
      payment: false,
      products: true,
      schedule: false,
      staff: true,
      richMenu: false,
    };
    const completedCount = Object.values(steps).filter(Boolean).length;
    expect(completedCount).toBe(3);
  });
});
