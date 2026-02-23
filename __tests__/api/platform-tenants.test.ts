// __tests__/api/platform-tenants.test.ts
// プラットフォームテナント管理API（GET/POST）のテスト
// 対象: app/api/platform/tenants/route.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モックヘルパー ===
function createChain(defaultResolve = { data: null, error: null, count: 0 }) {
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

// === モック定義 ===
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: vi.fn().mockResolvedValue({ userId: "admin-1", email: "admin@test.com", name: "管理者", platformRole: "platform_admin" }),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/platform-tenant", () => ({
  createTenantSchema: {},
}));

vi.mock("@/lib/username", () => ({
  generateUsername: vi.fn().mockResolvedValue("LP-A1B2C"),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("$2a$12$hashedpassword") },
}));

import { GET, POST } from "@/app/api/platform/tenants/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { parseBody } from "@/lib/validations/helpers";
import { supabaseAdmin } from "@/lib/supabase";

// === テスト本体 ===

// ------------------------------------------------------------------
// GET: テナント一覧取得
// ------------------------------------------------------------------
describe("GET /api/platform/tenants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  // 認証テスト
  describe("認証チェック", () => {
    it("認証失敗時は403を返す", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/platform/tenants");
      const res = await GET(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("権限がありません");
    });
  });

  // 正常系テスト
  describe("正常系", () => {
    it("テナント一覧を取得できる", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      // テナントクエリ結果
      const tenantsChain = createChain({
        data: [
          { id: "t1", name: "クリニックA", slug: "clinic-a", is_active: true, created_at: "2026-01-01" },
          { id: "t2", name: "クリニックB", slug: "clinic-b", is_active: true, created_at: "2026-01-02" },
        ],
        error: null,
        count: 2,
      });
      tableChains["tenants"] = tenantsChain;

      // RPC: 患者数
      (supabaseAdmin as any).rpc
        .mockResolvedValueOnce({ data: [{ tenant_id: "t1", count: 100 }, { tenant_id: "t2", count: 50 }] })
        .mockResolvedValueOnce({ data: [{ tenant_id: "t1", total: 500000 }, { tenant_id: "t2", total: 300000 }] });

      const req = new NextRequest("http://localhost/api/platform/tenants");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.tenants).toHaveLength(2);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.total).toBe(2);
    });

    it("検索パラメータが反映される", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      const tenantsChain = createChain({ data: [], error: null, count: 0 });
      tableChains["tenants"] = tenantsChain;

      const req = new NextRequest("http://localhost/api/platform/tenants?search=clinic&status=active&sort=name&page=2&limit=10");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);

      // or()が検索で呼ばれている
      expect(tenantsChain.or).toHaveBeenCalled();
      // eq()がステータスフィルターで呼ばれている
      expect(tenantsChain.eq).toHaveBeenCalled();
    });

    it("ステータスフィルター: active のみ", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      const tenantsChain = createChain({ data: [], error: null, count: 0 });
      tableChains["tenants"] = tenantsChain;

      const req = new NextRequest("http://localhost/api/platform/tenants?status=active");
      await GET(req);

      // eq("is_active", true) が呼ばれることを確認
      const eqCalls = tenantsChain.eq.mock.calls;
      const activeCall = eqCalls.find((c: any[]) => c[0] === "is_active" && c[1] === true);
      expect(activeCall).toBeDefined();
    });

    it("ステータスフィルター: inactive のみ", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      const tenantsChain = createChain({ data: [], error: null, count: 0 });
      tableChains["tenants"] = tenantsChain;

      const req = new NextRequest("http://localhost/api/platform/tenants?status=inactive");
      await GET(req);

      const eqCalls = tenantsChain.eq.mock.calls;
      const inactiveCall = eqCalls.find((c: any[]) => c[0] === "is_active" && c[1] === false);
      expect(inactiveCall).toBeDefined();
    });

    it("patients_count ソートが正しく動作する", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      const tenantsChain = createChain({
        data: [
          { id: "t1", name: "少ない", slug: "few" },
          { id: "t2", name: "多い", slug: "many" },
        ],
        error: null,
        count: 2,
      });
      tableChains["tenants"] = tenantsChain;

      (supabaseAdmin as any).rpc
        .mockResolvedValueOnce({ data: [{ tenant_id: "t1", count: 10 }, { tenant_id: "t2", count: 100 }] })
        .mockResolvedValueOnce({ data: null });

      const req = new NextRequest("http://localhost/api/platform/tenants?sort=patients_count");
      const res = await GET(req);
      const body = await res.json();
      // patients_count降順でソートされる
      expect(body.tenants[0].patients_count).toBe(100);
      expect(body.tenants[1].patients_count).toBe(10);
    });

    it("ページネーションが正しく計算される", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      const tenantsChain = createChain({ data: [], error: null, count: 100 });
      tableChains["tenants"] = tenantsChain;

      const req = new NextRequest("http://localhost/api/platform/tenants?page=3&limit=10");
      const res = await GET(req);
      const body = await res.json();
      expect(body.pagination.page).toBe(3);
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.total).toBe(100);
      expect(body.pagination.totalPages).toBe(10);
    });

    it("limitの上限は100", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      const tenantsChain = createChain({ data: [], error: null, count: 0 });
      tableChains["tenants"] = tenantsChain;

      const req = new NextRequest("http://localhost/api/platform/tenants?limit=500");
      const res = await GET(req);
      const body = await res.json();
      expect(body.pagination.limit).toBe(100);
    });

    it("limitの下限は1", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      const tenantsChain = createChain({ data: [], error: null, count: 0 });
      tableChains["tenants"] = tenantsChain;

      const req = new NextRequest("http://localhost/api/platform/tenants?limit=0");
      const res = await GET(req);
      const body = await res.json();
      expect(body.pagination.limit).toBe(1);
    });
  });

  // エラー系テスト
  describe("エラー系", () => {
    it("DBエラー時は500を返す", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      const tenantsChain = createChain({ data: null, error: { message: "DB error" }, count: null });
      tableChains["tenants"] = tenantsChain;

      const req = new NextRequest("http://localhost/api/platform/tenants");
      const res = await GET(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("テナント一覧の取得に失敗しました");
    });
  });

  // RPC フォールバックテスト
  describe("RPCフォールバック", () => {
    it("RPC未定義時は個別カウントにフォールバックする", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      const tenantsChain = createChain({
        data: [{ id: "t1", name: "テスト" }],
        error: null,
        count: 1,
      });
      tableChains["tenants"] = tenantsChain;

      // RPCがnullを返す→フォールバック
      (supabaseAdmin as any).rpc
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: null });

      // フォールバック用の patients, orders チェーン
      const patientsChain = createChain({ data: null, error: null, count: 42 });
      tableChains["patients"] = patientsChain;
      const ordersChain = createChain({ data: [{ amount: 10000 }, { amount: 20000 }], error: null });
      tableChains["orders"] = ordersChain;

      const req = new NextRequest("http://localhost/api/platform/tenants");
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });
});

// ------------------------------------------------------------------
// POST: テナント新規作成
// ------------------------------------------------------------------
describe("POST /api/platform/tenants", () => {
  const validTenantData = {
    name: "テストクリニック",
    slug: "test-clinic",
    adminName: "管理者",
    adminEmail: "admin@test.com",
    adminPassword: "password123",
    planName: "standard",
    monthlyFee: 50000,
    setupFee: 300000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};

    // デフォルト: parseBody成功
    (parseBody as any).mockResolvedValue({ data: validTenantData });
  });

  // 認証テスト
  describe("認証チェック", () => {
    it("認証失敗時は403を返す", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        body: JSON.stringify(validTenantData),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  // バリデーション
  describe("入力バリデーション", () => {
    it("parseBodyエラー時はエラーレスポンスを返す", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });
      const errorResponse = Response.json({ ok: false, error: "入力値が不正です" }, { status: 400 });
      (parseBody as any).mockResolvedValue({ error: errorResponse });

      const req = new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // slug 重複チェック
  describe("slug重複チェック", () => {
    it("slug重複時は409を返す", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      // slug検索: 既存あり
      const tenantsChain = createChain({ data: { id: "existing-id" }, error: null });
      tableChains["tenants"] = tenantsChain;

      const req = new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        body: JSON.stringify(validTenantData),
      });

      const res = await POST(req);
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe("このスラグは既に使用されています");
    });
  });

  // メールアドレス重複チェック
  describe("メールアドレス重複チェック", () => {
    it("メール重複時は409を返す", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      // slug検索: 未存在
      const tenantsChain = createChain({ data: null, error: null });
      tableChains["tenants"] = tenantsChain;
      // メール検索: 既存あり
      const adminUsersChain = createChain({ data: { id: "existing-user" }, error: null });
      tableChains["admin_users"] = adminUsersChain;

      const req = new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        body: JSON.stringify(validTenantData),
      });

      const res = await POST(req);
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe("このメールアドレスは既に使用されています");
    });
  });

  // 正常系テスト
  describe("正常系", () => {
    it("テナント作成に成功すると201を返す", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      // slug検索: なし（1回目のtenants.from）
      // テナントINSERT: 成功（2回目のtenants.from）
      // callを区別するためchainの返り値を設定
      let tenantsCallCount = 0;
      const tenantsChain = createChain();
      // maybeSingleの時は「slug検索」→null
      tenantsChain.maybeSingle = vi.fn().mockImplementation(() => {
        tenantsCallCount++;
        if (tenantsCallCount <= 1) {
          // slug検索: 存在しない
          return { then: (fn: any) => fn({ data: null, error: null }) };
        }
        return tenantsChain;
      });
      // singleの時は「テナントINSERT結果」
      tenantsChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: { id: "new-tenant-id" }, error: null }),
      });
      tableChains["tenants"] = tenantsChain;

      // メール検索: なし
      const adminUsersChain = createChain();
      let adminUsersCallCount = 0;
      adminUsersChain.maybeSingle = vi.fn().mockImplementation(() => {
        adminUsersCallCount++;
        if (adminUsersCallCount === 1) {
          // メール重複チェック: なし
          return { then: (fn: any) => fn({ data: null, error: null }) };
        }
        return adminUsersChain;
      });
      adminUsersChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: { id: "new-admin-id", username: "LP-A1B2C" }, error: null }),
      });
      tableChains["admin_users"] = adminUsersChain;

      // テナントメンバー
      const memberChain = createChain({ data: null, error: null });
      tableChains["tenant_members"] = memberChain;

      // プラン
      const planChain = createChain({ data: null, error: null });
      tableChains["tenant_plans"] = planChain;

      const req = new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        body: JSON.stringify(validTenantData),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.tenant.id).toBe("new-tenant-id");
      expect(body.tenant.name).toBe("テストクリニック");
      expect(body.adminUsername).toBe("LP-A1B2C");
    });
  });

  // テナント作成失敗時のテスト
  describe("テナント作成失敗", () => {
    it("テナントINSERT失敗時は500を返す", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      const tenantsChain = createChain();
      tenantsChain.maybeSingle = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: null, error: null }),
      });
      tenantsChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: null, error: { message: "insert failed" } }),
      });
      tableChains["tenants"] = tenantsChain;

      // メール検索: なし
      const adminUsersChain = createChain();
      adminUsersChain.maybeSingle = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: null, error: null }),
      });
      tableChains["admin_users"] = adminUsersChain;

      const req = new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        body: JSON.stringify(validTenantData),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("テナントの作成に失敗しました");
    });
  });

  // 管理者ユーザー作成失敗時のロールバックテスト
  describe("管理者ユーザー作成失敗時のロールバック", () => {
    it("管理者作成失敗時はテナントを削除してロールバックする", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      const tenantsChain = createChain();
      tenantsChain.maybeSingle = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: null, error: null }),
      });
      tenantsChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: { id: "new-tenant-id" }, error: null }),
      });
      tableChains["tenants"] = tenantsChain;

      // メール検索: なし、admin_usersの作成: 失敗
      const adminUsersChain = createChain();
      adminUsersChain.maybeSingle = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: null, error: null }),
      });
      adminUsersChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: null, error: { message: "admin insert failed" } }),
      });
      tableChains["admin_users"] = adminUsersChain;

      const req = new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        body: JSON.stringify(validTenantData),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("管理者ユーザーの作成に失敗しました");

      // テナント削除（ロールバック）が呼ばれたことを確認
      expect(tenantsChain.delete).toHaveBeenCalled();
    });
  });

  // LINE設定保存テスト
  describe("LINE設定保存", () => {
    it("LINE設定がある場合はtenant_settingsに保存される", async () => {
      (verifyPlatformAdmin as any).mockResolvedValue({ userId: "admin-1" });

      const dataWithLine = {
        ...validTenantData,
        lineChannelId: "12345",
        lineChannelSecret: "secret",
        lineAccessToken: "token",
      };
      (parseBody as any).mockResolvedValue({ data: dataWithLine });

      const tenantsChain = createChain();
      tenantsChain.maybeSingle = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: null, error: null }),
      });
      tenantsChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: { id: "t-new" }, error: null }),
      });
      tableChains["tenants"] = tenantsChain;

      const adminUsersChain = createChain();
      adminUsersChain.maybeSingle = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: null, error: null }),
      });
      adminUsersChain.single = vi.fn().mockReturnValue({
        then: (fn: any) => fn({ data: { id: "a-new", username: "LP-X1Y2Z" }, error: null }),
      });
      tableChains["admin_users"] = adminUsersChain;

      const memberChain = createChain({ data: null, error: null });
      tableChains["tenant_members"] = memberChain;
      const planChain = createChain({ data: null, error: null });
      tableChains["tenant_plans"] = planChain;
      const settingsChain = createChain({ data: null, error: null });
      tableChains["tenant_settings"] = settingsChain;

      const req = new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        body: JSON.stringify(dataWithLine),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      // tenant_settingsのinsertが呼ばれたことを確認
      expect(settingsChain.insert).toHaveBeenCalled();
    });
  });
});
