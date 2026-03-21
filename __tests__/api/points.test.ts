// __tests__/api/points.test.ts
// ポイント制度API + ライブラリのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyPatientSession } from "@/lib/patient-session";

// --- チェーンビルダー ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
    (chain as Record<string, ReturnType<typeof vi.fn>>)[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(defaultResolve));
  return chain;
}

const mockFrom = vi.fn();

const { mockVerifyAdminAuth, mockCookies } = vi.hoisted(() => ({
  mockVerifyAdminAuth: vi.fn().mockResolvedValue(true),
  mockCookies: vi.fn().mockResolvedValue({
    get: (name: string) => {
      if (name === "patient_id") return { value: "PAT001" };
      if (name === "__Host-patient_id") return undefined;
      return undefined;
    },
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mockFrom },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: mockVerifyAdminAuth,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/patient-session", () => ({
  verifyPatientSession: vi.fn().mockResolvedValue({ patientId: "PAT001", lineUserId: "U123" }),
  createPatientToken: vi.fn().mockResolvedValue("mock-jwt"),
  patientSessionCookieOptions: vi.fn().mockReturnValue({ httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 31536000 }),
}));

// --- ヘルパー ---
function createGetRequest(path: string) {
  return new Request(new URL(path, "http://localhost").toString(), { method: "GET" });
}

function createPostRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createPutRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** 連続するfrom呼び出しに対し、順番にチェーンを返す */
function mockFromSequence(...chains: ReturnType<typeof createChain>[]) {
  let idx = 0;
  mockFrom.mockImplementation(() => {
    const chain = chains[idx] || chains[chains.length - 1];
    idx++;
    return chain;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // デフォルト: 空チェーン
  mockFrom.mockImplementation(() => createChain());
  mockVerifyAdminAuth.mockResolvedValue(true);
});

// =============================================
// lib/points.ts テスト
// =============================================
describe("lib/points", () => {
  describe("getBalance", () => {
    it("残高レコードがある場合、最新のbalance_afterを返す", async () => {
      mockFromSequence(createChain({ data: { balance_after: 500 }, error: null }));
      const { getBalance } = await import("@/lib/points");
      const balance = await getBalance("test-tenant", "PAT001");
      expect(balance).toBe(500);
    });

    it("残高レコードがない場合、0を返す", async () => {
      mockFromSequence(createChain({ data: null, error: null }));
      const { getBalance } = await import("@/lib/points");
      const balance = await getBalance("test-tenant", "PAT001");
      expect(balance).toBe(0);
    });

    it("DBエラー時にthrowする", async () => {
      mockFromSequence(createChain({ data: null, error: { message: "DB error" } }));
      const { getBalance } = await import("@/lib/points");
      await expect(getBalance("test-tenant", "PAT001")).rejects.toThrow("ポイント残高の取得に失敗しました");
    });
  });

  describe("grantPoints", () => {
    it("正常にポイントを付与できる", async () => {
      const entry = {
        id: "uuid-1", tenant_id: "test-tenant", patient_id: "PAT001",
        amount: 100, balance_after: 100, reason: "テスト付与",
        reference_type: "manual", reference_id: null, created_at: "2026-03-08T00:00:00Z",
      };
      // 1回目: getBalance(残高0)、2回目: insert(成功)
      mockFromSequence(
        createChain({ data: null, error: null }),
        createChain({ data: entry, error: null }),
      );

      const { grantPoints } = await import("@/lib/points");
      const result = await grantPoints("test-tenant", "PAT001", 100, "テスト付与", "manual");
      expect(result.amount).toBe(100);
      expect(result.balance_after).toBe(100);
    });

    it("amount<=0の場合エラー", async () => {
      const { grantPoints } = await import("@/lib/points");
      await expect(grantPoints("test-tenant", "PAT001", 0, "テスト", "manual")).rejects.toThrow("付与ポイントは正の整数");
      await expect(grantPoints("test-tenant", "PAT001", -1, "テスト", "manual")).rejects.toThrow("付与ポイントは正の整数");
    });
  });

  describe("usePoints", () => {
    it("残高不足時にエラー", async () => {
      mockFromSequence(createChain({ data: { balance_after: 50 }, error: null }));
      const { usePoints } = await import("@/lib/points");
      await expect(usePoints("test-tenant", "PAT001", 100, "テスト利用", "order")).rejects.toThrow("ポイント残高不足");
    });

    it("amount<=0の場合エラー", async () => {
      const { usePoints } = await import("@/lib/points");
      await expect(usePoints("test-tenant", "PAT001", 0, "テスト", "order")).rejects.toThrow("利用ポイントは正の整数");
    });

    it("正常にポイントを利用できる", async () => {
      const entry = {
        id: "uuid-2", tenant_id: "test-tenant", patient_id: "PAT001",
        amount: -50, balance_after: 450, reason: "商品購入",
        reference_type: "order", reference_id: "ORD-001", created_at: "2026-03-08T01:00:00Z",
      };
      mockFromSequence(
        createChain({ data: { balance_after: 500 }, error: null }),
        createChain({ data: entry, error: null }),
      );

      const { usePoints } = await import("@/lib/points");
      const result = await usePoints("test-tenant", "PAT001", 50, "商品購入", "order", "ORD-001");
      expect(result.amount).toBe(-50);
      expect(result.balance_after).toBe(450);
    });
  });

  describe("getHistory", () => {
    it("履歴を取得できる", async () => {
      const entries = [
        { id: "1", amount: 100, balance_after: 100, created_at: "2026-03-08T00:00:00Z" },
        { id: "2", amount: -50, balance_after: 50, created_at: "2026-03-08T01:00:00Z" },
      ];
      mockFromSequence(createChain({ data: entries, error: null }));

      const { getHistory } = await import("@/lib/points");
      const result = await getHistory("test-tenant", "PAT001");
      expect(result).toHaveLength(2);
    });

    it("DBエラー時にthrowする", async () => {
      mockFromSequence(createChain({ data: null, error: { message: "DB error" } }));
      const { getHistory } = await import("@/lib/points");
      await expect(getHistory("test-tenant", "PAT001")).rejects.toThrow("ポイント履歴の取得に失敗しました");
    });
  });

  describe("getPointSettings", () => {
    it("設定がある場合そのまま返す", async () => {
      const settings = {
        id: "uuid-s", tenant_id: "test-tenant",
        points_per_yen: 2, expiry_months: 6, is_active: true,
      };
      mockFromSequence(createChain({ data: settings, error: null }));

      const { getPointSettings } = await import("@/lib/points");
      const result = await getPointSettings("test-tenant");
      expect(result.points_per_yen).toBe(2);
      expect(result.expiry_months).toBe(6);
    });

    it("設定がない場合デフォルト値を返す", async () => {
      mockFromSequence(createChain({ data: null, error: null }));
      const { getPointSettings } = await import("@/lib/points");
      const result = await getPointSettings("test-tenant");
      expect(result.points_per_yen).toBe(1);
      expect(result.expiry_months).toBe(12);
      expect(result.is_active).toBe(true);
    });
  });
});

// =============================================
// 管理API: admin/points テスト
// =============================================
describe("GET /api/admin/points", () => {
  it("未認証の場合401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const { GET } = await import("@/app/api/admin/points/route");
    const res = await GET(createGetRequest("/api/admin/points") as any);
    expect(res.status).toBe(401);
  });

  it("ポイント一覧を取得できる", async () => {
    const ledgerData = [
      { patient_id: "PAT001", balance_after: 500, created_at: "2026-03-08T02:00:00Z" },
      { patient_id: "PAT001", balance_after: 400, created_at: "2026-03-08T01:00:00Z" },
      { patient_id: "PAT002", balance_after: 200, created_at: "2026-03-08T01:00:00Z" },
    ];
    mockFromSequence(createChain({ data: ledgerData, error: null }));

    const { GET } = await import("@/app/api/admin/points/route");
    const res = await GET(createGetRequest("/api/admin/points") as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data).toHaveLength(2); // 2患者に集約
    expect(json.total).toBe(2);
  });
});

describe("POST /api/admin/points", () => {
  it("未認証の場合401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const { POST } = await import("@/app/api/admin/points/route");
    const res = await POST(createPostRequest("/api/admin/points", {}) as any);
    expect(res.status).toBe(401);
  });

  it("patient_id未指定で400", async () => {
    const { POST } = await import("@/app/api/admin/points/route");
    const res = await POST(createPostRequest("/api/admin/points", { amount: 100, reason: "test" }) as any);
    expect(res.status).toBe(400);
  });

  it("amount未指定で400", async () => {
    const { POST } = await import("@/app/api/admin/points/route");
    const res = await POST(createPostRequest("/api/admin/points", { patient_id: "PAT001", reason: "test" }) as any);
    expect(res.status).toBe(400);
  });

  it("reason未指定で400", async () => {
    const { POST } = await import("@/app/api/admin/points/route");
    const res = await POST(createPostRequest("/api/admin/points", { patient_id: "PAT001", amount: 100 }) as any);
    expect(res.status).toBe(400);
  });

  it("正常にポイントを手動付与できる", async () => {
    const entry = {
      id: "uuid-3", tenant_id: "test-tenant", patient_id: "PAT001",
      amount: 100, balance_after: 100, reason: "キャンペーン",
      reference_type: "manual", reference_id: null, created_at: "2026-03-08T00:00:00Z",
    };
    mockFromSequence(
      createChain({ data: null, error: null }),   // getBalance
      createChain({ data: entry, error: null }),   // insert
    );

    const { POST } = await import("@/app/api/admin/points/route");
    const res = await POST(createPostRequest("/api/admin/points", {
      patient_id: "PAT001",
      amount: 100,
      reason: "キャンペーン",
    }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.entry.amount).toBe(100);
  });
});

// =============================================
// 管理API: admin/points/settings テスト
// =============================================
describe("GET /api/admin/points/settings", () => {
  it("未認証の場合401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const { GET } = await import("@/app/api/admin/points/settings/route");
    const res = await GET(createGetRequest("/api/admin/points/settings") as any);
    expect(res.status).toBe(401);
  });

  it("設定を取得できる", async () => {
    const settings = {
      id: "uuid-s", tenant_id: "test-tenant",
      points_per_yen: 1, expiry_months: 12, is_active: true,
    };
    mockFromSequence(createChain({ data: settings, error: null }));

    const { GET } = await import("@/app/api/admin/points/settings/route");
    const res = await GET(createGetRequest("/api/admin/points/settings") as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.settings.points_per_yen).toBe(1);
  });
});

describe("PUT /api/admin/points/settings", () => {
  it("未認証の場合401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const { PUT } = await import("@/app/api/admin/points/settings/route");
    const res = await PUT(createPutRequest("/api/admin/points/settings", {}) as any);
    expect(res.status).toBe(401);
  });

  it("points_per_yenが負の場合400", async () => {
    const { PUT } = await import("@/app/api/admin/points/settings/route");
    const res = await PUT(createPutRequest("/api/admin/points/settings", { points_per_yen: -1 }) as any);
    expect(res.status).toBe(400);
  });

  it("expiry_monthsが0の場合400", async () => {
    const { PUT } = await import("@/app/api/admin/points/settings/route");
    const res = await PUT(createPutRequest("/api/admin/points/settings", { expiry_months: 0 }) as any);
    expect(res.status).toBe(400);
  });

  it("正常に設定を更新できる", async () => {
    const updated = {
      id: "uuid-s", tenant_id: "test-tenant",
      points_per_yen: 2, expiry_months: 6, is_active: true,
    };
    mockFromSequence(createChain({ data: updated, error: null }));

    const { PUT } = await import("@/app/api/admin/points/settings/route");
    const res = await PUT(createPutRequest("/api/admin/points/settings", {
      points_per_yen: 2,
      expiry_months: 6,
    }) as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// =============================================
// 管理API: admin/points/[patientId] テスト
// =============================================
describe("GET /api/admin/points/[patientId]", () => {
  it("未認証の場合401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const { GET } = await import("@/app/api/admin/points/[patientId]/route");
    const res = await GET(
      createGetRequest("/api/admin/points/PAT001") as any,
      { params: Promise.resolve({ patientId: "PAT001" }) },
    );
    expect(res.status).toBe(401);
  });

  it("患者のポイント残高+履歴を取得できる", async () => {
    const historyData = [
      { id: "1", amount: 500, balance_after: 500, created_at: "2026-03-08T00:00:00Z" },
      { id: "2", amount: -200, balance_after: 300, created_at: "2026-03-08T01:00:00Z" },
    ];
    mockFromSequence(
      createChain({ data: { balance_after: 300 }, error: null }),  // getBalance
      createChain({ data: historyData, error: null }),              // getHistory
    );

    const { GET } = await import("@/app/api/admin/points/[patientId]/route");
    const res = await GET(
      createGetRequest("/api/admin/points/PAT001") as any,
      { params: Promise.resolve({ patientId: "PAT001" }) },
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.patient_id).toBe("PAT001");
    expect(json.balance).toBe(300);
    expect(json.history).toHaveLength(2);
  });
});

// =============================================
// 患者マイページAPI: mypage/points テスト
// =============================================
describe("GET /api/mypage/points", () => {
  it("patient_idクッキーがない場合401を返す", async () => {
    vi.mocked(verifyPatientSession).mockResolvedValueOnce(null as any);
    mockCookies.mockResolvedValueOnce({
      get: () => undefined,
    });

    const { GET } = await import("@/app/api/mypage/points/route");
    const res = await GET(createGetRequest("/api/mypage/points") as any);
    expect(res.status).toBe(401);
  });

  it("自分のポイント残高+履歴を取得できる", async () => {
    const historyData = [
      { id: "1", amount: 200, balance_after: 200, created_at: "2026-03-08T00:00:00Z" },
      { id: "2", amount: -50, balance_after: 150, created_at: "2026-03-08T01:00:00Z" },
    ];
    mockFromSequence(
      createChain({ data: { balance_after: 150 }, error: null }),  // getBalance
      createChain({ data: historyData, error: null }),              // getHistory
    );

    const { GET } = await import("@/app/api/mypage/points/route");
    const res = await GET(createGetRequest("/api/mypage/points") as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.balance).toBe(150);
    expect(json.history).toHaveLength(2);
  });
});
