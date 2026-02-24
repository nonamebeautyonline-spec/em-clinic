// __tests__/api/status-page.test.ts
// ステータスページAPI + インシデントAPI テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase モック ---
const mockQueryResult = { data: [], error: null };

function createChainableQuery(result: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => {
      // limit() の戻りは await 可能な Supabase 結果
      return Promise.resolve(result);
    }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => {
      return Promise.resolve(result);
    }),
    // await query で結果を返せるようにする
    then: (resolve: any) => resolve(result),
  };
  return chain;
}

let currentMockResult = { data: [] as any[], error: null as any };

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => createChainableQuery(currentMockResult)),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((q: any) => q),
}));

// Redis モック
vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({
    ping: vi.fn().mockResolvedValue("PONG"),
  })),
}));

// platform-auth モック
const mockVerifyPlatformAdmin = vi.fn();
vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: (...args: any[]) => mockVerifyPlatformAdmin(...args),
}));

// --- リクエスト生成ヘルパー ---
function createMockRequest(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return req as any;
}

// ===== 公開ステータスAPI テスト =====
describe("公開ステータスAPI (/api/status)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMockResult = { data: [{ id: 1 }], error: null };
  });

  it("正常レスポンスを返す", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    const { GET } = await import("@/app/api/status/route");
    const req = createMockRequest("GET", "http://localhost/api/status");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("status");
    expect(json).toHaveProperty("services");
    expect(json).toHaveProperty("incidents");
    expect(json).toHaveProperty("timestamp");
  });

  it("servicesにdatabase, cache, apiが含まれる", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    const { GET } = await import("@/app/api/status/route");
    const req = createMockRequest("GET", "http://localhost/api/status");
    const res = await GET(req);
    const json = await res.json();
    expect(json.services).toHaveProperty("database");
    expect(json.services).toHaveProperty("cache");
    expect(json.services).toHaveProperty("api");
    expect(json.services.api).toBe("healthy");
  });

  it("DB接続正常時はhealthyステータス", async () => {
    currentMockResult = { data: [{ id: 1 }], error: null };

    const { GET } = await import("@/app/api/status/route");
    const req = createMockRequest("GET", "http://localhost/api/status");
    const res = await GET(req);
    const json = await res.json();
    expect(json.services.database).toBe("healthy");
  });
});

// ===== インシデントAPI テスト =====
import { GET as incidentGET, POST as incidentPOST } from "@/app/api/platform/incidents/route";

describe("インシデントAPI (/api/platform/incidents)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyPlatformAdmin.mockResolvedValue({
      userId: "admin-001",
      email: "admin@test.com",
      name: "Admin",
      tenantId: null,
      platformRole: "platform_admin",
    });
    currentMockResult = { data: [], error: null };
  });

  describe("GET: インシデント一覧", () => {
    it("権限なし → 403", async () => {
      mockVerifyPlatformAdmin.mockResolvedValue(null);
      const req = createMockRequest("GET", "http://localhost/api/platform/incidents");
      const res = await incidentGET(req);
      expect(res.status).toBe(403);
    });

    it("正常取得 → incidents配列", async () => {
      // GETの場合、limitの戻り値がawaitされる
      currentMockResult = {
        data: [
          { id: "inc-1", title: "テスト障害", severity: "minor", status: "resolved" },
        ],
        error: null,
      };

      const req = createMockRequest("GET", "http://localhost/api/platform/incidents");
      const res = await incidentGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.incidents).toBeDefined();
    });
  });

  describe("POST: インシデント作成", () => {
    it("権限なし → 403", async () => {
      mockVerifyPlatformAdmin.mockResolvedValue(null);
      const req = createMockRequest("POST", "http://localhost/api/platform/incidents", {
        title: "テスト",
      });
      const res = await incidentPOST(req);
      expect(res.status).toBe(403);
    });

    it("titleなし → 400", async () => {
      const req = createMockRequest("POST", "http://localhost/api/platform/incidents", {});
      const res = await incidentPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("titleは必須です");
    });

    it("不正なseverity → 400", async () => {
      const req = createMockRequest("POST", "http://localhost/api/platform/incidents", {
        title: "テスト障害",
        severity: "invalid",
      });
      const res = await incidentPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("severityは");
    });

    it("不正なstatus → 400", async () => {
      const req = createMockRequest("POST", "http://localhost/api/platform/incidents", {
        title: "テスト障害",
        status: "invalid",
      });
      const res = await incidentPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("statusは");
    });

    it("正常作成 → 201", async () => {
      currentMockResult = {
        data: {
          id: "inc-new",
          title: "DB障害",
          severity: "critical",
          status: "investigating",
        },
        error: null,
      };

      const req = createMockRequest("POST", "http://localhost/api/platform/incidents", {
        title: "DB障害",
        severity: "critical",
      });
      const res = await incidentPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.incident.title).toBe("DB障害");
    });

    it("不正なJSON → 400", async () => {
      const req = new Request("http://localhost/api/platform/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "INVALID{{{",
      }) as any;
      const res = await incidentPOST(req);
      expect(res.status).toBe(400);
    });
  });
});
