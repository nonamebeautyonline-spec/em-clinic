// __tests__/api/mypage.test.ts
// マイページAPI (app/api/mypage/route.ts) の統合テスト
// 認証、キャッシュ、DB並列取得、LINE UID整合性チェック、NG患者判定をテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モックチェーン ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
    "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
  ].forEach((m) => {
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

// --- モック（vi.mock内ではトップレベル変数を参照しない） ---
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      // テスト側で tableChains を操作してモックを設定
      const { getOrCreateChain: goc } = require("./__mypage_helpers");
      return goc(table);
    }),
  },
}));

// ↑の方式だとvi.mock内でrequireが必要になるので、別の方式を使う
// vi.mock はファクトリ関数の外から変数を参照できないため、
// globalThisを使用して共有する
vi.mock("@/lib/supabase", () => {
  return {
    supabaseAdmin: {
      from: vi.fn((...args: any[]) => {
        // globalThis 経由でtableChains にアクセス
        const chains = (globalThis as any).__testTableChains || {};
        const table = args[0];
        if (!chains[table]) {
          const c: any = {};
          [
            "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
            "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
            "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
          ].forEach((m) => {
            c[m] = vi.fn().mockReturnValue(c);
          });
          c.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));
          chains[table] = c;
        }
        return chains[table];
      }),
    },
  };
});

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

const _mockCookieStore = {
  get: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(_mockCookieStore)),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
  },
  getDashboardCacheKey: vi.fn((pid: string) => `dashboard:${pid}`),
}));

vi.mock("@/lib/validations/helpers", () => ({
  validateBody: vi.fn((raw: any) => {
    if (raw && typeof raw === "object") return { data: raw };
    return { data: {} };
  }),
}));

vi.mock("@/lib/validations/mypage", () => ({
  mypageDashboardSchema: {},
}));

// --- ルートインポート ---
import { POST } from "@/app/api/mypage/route";
import { redis } from "@/lib/redis";

// --- ヘルパー ---
function createRequest(body: any = {}) {
  return new NextRequest("http://localhost:3000/api/mypage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// テーブルチェーンを設定する関数
function setTableChain(table: string, chain: any) {
  (globalThis as any).__testTableChains[table] = chain;
}

describe("POST /api/mypage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__testTableChains = {};
    _mockCookieStore.get.mockReset();
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockResolvedValue("OK");
  });

  // --- 認証テスト ---
  describe("認証", () => {
    it("patient_id Cookieがない場合は401を返す", async () => {
      _mockCookieStore.get.mockReturnValue(undefined);

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("unauthorized");
    });

    it("__Host-patient_id Cookieがあれば認証成功", async () => {
      _mockCookieStore.get.mockImplementation((name: string) => {
        if (name === "__Host-patient_id") return { value: "pid-001" };
        return undefined;
      });

      // patientsのline_idがnull = 整合性チェックスキップ
      const pChain = createChain({ data: { patient_id: "pid-001", name: "テスト太郎", line_id: null }, error: null });
      setTableChain("patients", pChain);
      setTableChain("intake", createChain({ data: null, error: null }));
      setTableChain("reservations", createChain({ data: null, error: null }));
      setTableChain("orders", createChain({ data: [], error: null }));
      setTableChain("reorders", createChain({ data: [], error: null }));

      const res = await POST(createRequest());
      expect(res.status).toBe(200);
    });

    it("patient_id Cookieでフォールバック認証", async () => {
      _mockCookieStore.get.mockImplementation((name: string) => {
        if (name === "patient_id") return { value: "pid-002" };
        return undefined;
      });

      setTableChain("patients", createChain({ data: { patient_id: "pid-002", name: "太郎", line_id: null }, error: null }));
      setTableChain("intake", createChain({ data: null, error: null }));
      setTableChain("reservations", createChain({ data: null, error: null }));
      setTableChain("orders", createChain({ data: [], error: null }));
      setTableChain("reorders", createChain({ data: [], error: null }));

      const res = await POST(createRequest());
      expect(res.status).toBe(200);
    });
  });

  // --- LINE UID 整合性チェック ---
  describe("LINE UID 整合性チェック", () => {
    it("line_user_id と patient の line_id が不一致なら pid_mismatch で401", async () => {
      _mockCookieStore.get.mockImplementation((name: string) => {
        if (name === "__Host-patient_id") return { value: "pid-001" };
        if (name === "__Host-line_user_id") return { value: "U-different" };
        return undefined;
      });

      // patients.line_id が別の値
      setTableChain("patients", createChain({ data: { line_id: "U-original" }, error: null }));

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("pid_mismatch");
    });

    it("line_user_id と patient の line_id が一致なら成功", async () => {
      _mockCookieStore.get.mockImplementation((name: string) => {
        if (name === "__Host-patient_id") return { value: "pid-001" };
        if (name === "__Host-line_user_id") return { value: "U-same" };
        return undefined;
      });

      setTableChain("patients", createChain({ data: { patient_id: "pid-001", name: "太郎", line_id: "U-same" }, error: null }));
      setTableChain("intake", createChain({ data: null, error: null }));
      setTableChain("reservations", createChain({ data: null, error: null }));
      setTableChain("orders", createChain({ data: [], error: null }));
      setTableChain("reorders", createChain({ data: [], error: null }));

      const res = await POST(createRequest());
      expect(res.status).toBe(200);
    });
  });

  // --- キャッシュテスト ---
  describe("キャッシュ", () => {
    it("キャッシュヒットした場合はキャッシュデータを返す", async () => {
      _mockCookieStore.get.mockImplementation((name: string) => {
        if (name === "__Host-patient_id") return { value: "pid-cached" };
        return undefined;
      });

      // 整合性チェック用: line_idがnull
      setTableChain("patients", createChain({ data: { line_id: null }, error: null }));

      const cachedPayload = { ok: true, patient: { id: "pid-cached", displayName: "キャッシュ太郎" } };
      vi.mocked(redis.get).mockResolvedValue(cachedPayload as any);

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.patient.displayName).toBe("キャッシュ太郎");
    });

    it("refresh=true の場合はキャッシュをスキップしDBから取得する", async () => {
      _mockCookieStore.get.mockImplementation((name: string) => {
        if (name === "__Host-patient_id") return { value: "pid-001" };
        return undefined;
      });

      setTableChain("patients", createChain({ data: { patient_id: "pid-001", name: "DB太郎", line_id: null }, error: null }));
      setTableChain("intake", createChain({ data: null, error: null }));
      setTableChain("reservations", createChain({ data: null, error: null }));
      setTableChain("orders", createChain({ data: [], error: null }));
      setTableChain("reorders", createChain({ data: [], error: null }));

      const cachedPayload = { ok: true, patient: { id: "pid-001", displayName: "キャッシュ太郎" } };
      vi.mocked(redis.get).mockResolvedValue(cachedPayload as any);

      const res = await POST(createRequest({ refresh: true }));
      const body = await res.json();

      expect(res.status).toBe(200);
      // キャッシュを使わなかったので redis.set が呼ばれる
      expect(redis.set).toHaveBeenCalled();
    });
  });

  // --- レスポンスデータテスト ---
  describe("レスポンス構造", () => {
    beforeEach(() => {
      _mockCookieStore.get.mockImplementation((name: string) => {
        if (name === "__Host-patient_id") return { value: "pid-001" };
        return undefined;
      });
    });

    it("正常レスポンスにok, patient, orders, ordersFlags等が含まれる", async () => {
      setTableChain("patients", createChain({
        data: { patient_id: "pid-001", name: "テスト太郎", line_id: "" },
        error: null,
      }));
      setTableChain("intake", createChain({
        data: { patient_id: "pid-001", status: "OK", answers: { ng_check: "OK" } },
        error: null,
      }));
      setTableChain("reservations", createChain({ data: null, error: null }));
      setTableChain("orders", createChain({ data: [], error: null }));
      setTableChain("reorders", createChain({ data: [], error: null }));

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body).toHaveProperty("patient");
      expect(body).toHaveProperty("orders");
      expect(body).toHaveProperty("ordersFlags");
      expect(body).toHaveProperty("reorders");
      expect(body).toHaveProperty("history");
      expect(body).toHaveProperty("hasIntake");
    });

    it("注文がない場合のordersFlags", async () => {
      setTableChain("patients", createChain({
        data: { patient_id: "pid-001", name: "太郎", line_id: "" },
        error: null,
      }));
      setTableChain("intake", createChain({ data: null, error: null }));
      setTableChain("reservations", createChain({ data: null, error: null }));
      setTableChain("orders", createChain({ data: [], error: null }));
      setTableChain("reorders", createChain({ data: [], error: null }));

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.ordersFlags.canPurchaseCurrentCourse).toBe(true);
      expect(body.ordersFlags.canApplyReorder).toBe(false);
      expect(body.ordersFlags.hasAnyPaidOrder).toBe(false);
    });

    it("NG患者は購入不可", async () => {
      setTableChain("patients", createChain({
        data: { patient_id: "pid-ng", name: "NG太郎", line_id: "" },
        error: null,
      }));
      setTableChain("intake", createChain({
        data: { patient_id: "pid-ng", status: "NG", answers: { ng_check: "NG" } },
        error: null,
      }));
      setTableChain("reservations", createChain({ data: null, error: null }));
      setTableChain("orders", createChain({ data: [], error: null }));
      setTableChain("reorders", createChain({ data: [], error: null }));

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.ordersFlags.canPurchaseCurrentCourse).toBe(false);
      expect(body.ordersFlags.canApplyReorder).toBe(false);
    });
  });

  // --- エラーハンドリング ---
  describe("エラーハンドリング", () => {
    it("予期しないエラー発生時は500を返す", async () => {
      _mockCookieStore.get.mockImplementation(() => {
        throw new Error("予期しないエラー");
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("unexpected_error");
    });
  });
});
