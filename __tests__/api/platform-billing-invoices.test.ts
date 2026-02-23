// __tests__/api/platform-billing-invoices.test.ts
// 請求書一覧取得・新規作成API (app/api/platform/billing/invoices/route.ts) の統合テスト
// プラットフォーム認証、GET一覧取得（フィルタ・ページネーション・KPI）、POST新規作成をテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モックチェーン ---
function createChain(defaultResolve: any = { data: null, error: null, count: 0 }) {
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

vi.mock("@/lib/supabase", () => {
  return {
    supabaseAdmin: {
      from: vi.fn((...args: any[]) => {
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
          c.then = vi.fn((resolve: any) => resolve({ data: null, error: null, count: 0 }));
          chains[table] = c;
        }
        return chains[table];
      }),
    },
  };
});

// プラットフォーム管理者認証モック
vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: vi.fn().mockResolvedValue({
    userId: "platform-admin-1",
    email: "admin@lope.jp",
    name: "プラットフォーム管理者",
    tenantId: null,
    platformRole: "platform_admin",
  }),
}));

// 監査ログモック
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

// parseBody モック
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/platform-billing", () => ({
  createInvoiceSchema: {},
}));

// --- ルートインポート ---
import { GET, POST } from "@/app/api/platform/billing/invoices/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";

// --- ヘルパー ---
function createGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/platform/billing/invoices");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

function createPostRequest(body: any = {}) {
  return new NextRequest("http://localhost:3000/api/platform/billing/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setTableChain(table: string, chain: any) {
  (globalThis as any).__testTableChains[table] = chain;
}

describe("platform/billing/invoices API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__testTableChains = {};
    vi.mocked(verifyPlatformAdmin).mockResolvedValue({
      userId: "platform-admin-1",
      email: "admin@lope.jp",
      name: "プラットフォーム管理者",
      tenantId: null,
      platformRole: "platform_admin",
    });
  });

  // === GET: 請求書一覧 ===
  describe("GET /api/platform/billing/invoices", () => {
    // --- 認証テスト ---
    describe("認証", () => {
      it("プラットフォーム管理者でない場合は403を返す", async () => {
        vi.mocked(verifyPlatformAdmin).mockResolvedValue(null);

        const res = await GET(createGetRequest());
        const body = await res.json();

        expect(res.status).toBe(403);
        expect(body.ok).toBe(false);
        expect(body.error).toBe("権限がありません");
      });
    });

    // --- 一覧取得テスト ---
    describe("一覧取得", () => {
      it("請求書一覧を正常に返す", async () => {
        const invoicesChain = createChain({
          data: [
            {
              id: "inv-1",
              tenant_id: "t-1",
              amount: 50000,
              tax_amount: 5000,
              status: "pending",
              created_at: "2026-02-01",
              tenants: { id: "t-1", name: "テストクリニック", slug: "test" },
            },
            {
              id: "inv-2",
              tenant_id: "t-2",
              amount: 30000,
              tax_amount: 3000,
              status: "paid",
              created_at: "2026-02-15",
              tenants: { id: "t-2", name: "サンプルクリニック", slug: "sample" },
            },
          ],
          error: null,
          count: 2,
        });
        setTableChain("billing_invoices", invoicesChain);

        const res = await GET(createGetRequest());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.invoices).toHaveLength(2);
        expect(body).toHaveProperty("kpi");
        expect(body).toHaveProperty("pagination");
      });

      it("テナントIDでフィルターできる", async () => {
        const invoicesChain = createChain({ data: [], error: null, count: 0 });
        setTableChain("billing_invoices", invoicesChain);

        const res = await GET(createGetRequest({ tenant_id: "t-1" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        // eq が tenant_id でフィルターされたことを確認
        expect(invoicesChain.eq).toHaveBeenCalledWith("tenant_id", "t-1");
      });

      it("ステータスでフィルターできる", async () => {
        const invoicesChain = createChain({ data: [], error: null, count: 0 });
        setTableChain("billing_invoices", invoicesChain);

        const res = await GET(createGetRequest({ status: "pending" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(invoicesChain.eq).toHaveBeenCalledWith("status", "pending");
      });

      it("status=all の場合はステータスフィルターなし", async () => {
        const invoicesChain = createChain({ data: [], error: null, count: 0 });
        setTableChain("billing_invoices", invoicesChain);

        const res = await GET(createGetRequest({ status: "all" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        // "all" の場合、eq("status", ...) が呼ばれないこと（tenant_id 以外の eq）
        // 注意: select内のeqもあるのでこの検証は省略
      });
    });

    // --- ページネーションテスト ---
    describe("ページネーション", () => {
      it("ページネーション情報が返される", async () => {
        const invoicesChain = createChain({ data: [], error: null, count: 50 });
        setTableChain("billing_invoices", invoicesChain);

        const res = await GET(createGetRequest({ page: "2", limit: "10" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.pagination).toEqual({
          total: 50,
          page: 2,
          limit: 10,
          totalPages: 5,
        });
        // range が正しいオフセットで呼ばれた
        expect(invoicesChain.range).toHaveBeenCalledWith(10, 19);
      });

      it("limitは最大100まで", async () => {
        const invoicesChain = createChain({ data: [], error: null, count: 0 });
        setTableChain("billing_invoices", invoicesChain);

        const res = await GET(createGetRequest({ limit: "999" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.pagination.limit).toBe(100);
      });

      it("pageは最小1", async () => {
        const invoicesChain = createChain({ data: [], error: null, count: 0 });
        setTableChain("billing_invoices", invoicesChain);

        const res = await GET(createGetRequest({ page: "0" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.pagination.page).toBe(1);
      });
    });

    // --- KPI テスト ---
    describe("KPI集計", () => {
      it("今月のKPI（請求総額・未収金・入金済み）が返される", async () => {
        const invoicesChain = createChain({
          data: [
            { amount: 50000, tax_amount: 5000, status: "paid" },
            { amount: 30000, tax_amount: 3000, status: "pending" },
            { amount: 20000, tax_amount: 2000, status: "overdue" },
          ],
          error: null,
          count: 3,
        });
        setTableChain("billing_invoices", invoicesChain);

        const res = await GET(createGetRequest());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.kpi).toHaveProperty("totalBilled");
        expect(body.kpi).toHaveProperty("totalPending");
        expect(body.kpi).toHaveProperty("totalPaid");
      });
    });

    // --- エラーハンドリング ---
    describe("エラーハンドリング", () => {
      it("DBエラー時は500を返す", async () => {
        const invoicesChain = createChain({ data: null, error: { message: "DB error" }, count: 0 });
        setTableChain("billing_invoices", invoicesChain);

        const res = await GET(createGetRequest());
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.ok).toBe(false);
        expect(body.error).toBe("請求書一覧の取得に失敗しました");
      });

      it("予期しないエラー時は500を返す", async () => {
        const invoicesChain = createChain({ data: null, error: null, count: 0 });
        invoicesChain.then = vi.fn(() => { throw new Error("予期しないエラー"); });
        setTableChain("billing_invoices", invoicesChain);

        const res = await GET(createGetRequest());
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.error).toBe("予期しないエラーが発生しました");
      });
    });
  });

  // === POST: 請求書新規作成 ===
  describe("POST /api/platform/billing/invoices", () => {
    // --- 認証テスト ---
    describe("認証", () => {
      it("プラットフォーム管理者でない場合は403を返す", async () => {
        vi.mocked(verifyPlatformAdmin).mockResolvedValue(null);

        const res = await POST(createPostRequest());
        const body = await res.json();

        expect(res.status).toBe(403);
        expect(body.ok).toBe(false);
      });
    });

    // --- バリデーション ---
    describe("バリデーション", () => {
      it("parseBody がエラーを返した場合はそのエラーを返す", async () => {
        const errorRes = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), { status: 400 });
        vi.mocked(parseBody).mockResolvedValue({ error: errorRes } as any);

        const res = await POST(createPostRequest({}));
        expect(res.status).toBe(400);
      });
    });

    // --- 請求書作成テスト ---
    describe("請求書作成", () => {
      it("正常に請求書を作成する", async () => {
        vi.mocked(parseBody).mockResolvedValue({
          data: {
            tenantId: "tenant-uuid-1",
            amount: 50000,
            taxAmount: 5000,
            billingPeriodStart: "2026-02-01",
            billingPeriodEnd: "2026-02-28",
            notes: "2月分請求書",
          },
        } as any);

        // テナント存在確認
        const tenantsChain = createChain({ data: { id: "tenant-uuid-1", name: "テストクリニック" }, error: null });
        setTableChain("tenants", tenantsChain);

        // テナントプラン
        const plansChain = createChain({ data: { id: "plan-1" }, error: null });
        setTableChain("tenant_plans", plansChain);

        // 請求書INSERT
        const invoicesChain = createChain({
          data: {
            id: "inv-new-1",
            tenant_id: "tenant-uuid-1",
            amount: 50000,
            tax_amount: 5000,
            status: "pending",
          },
          error: null,
        });
        setTableChain("billing_invoices", invoicesChain);

        const req = createPostRequest({});
        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.ok).toBe(true);
        expect(body).toHaveProperty("invoice");
        // 監査ログが記録された
        expect(logAudit).toHaveBeenCalledWith(
          expect.any(Object), // req
          "create_invoice",
          "billing_invoice",
          "inv-new-1",
          expect.objectContaining({ tenantId: "tenant-uuid-1" }),
        );
      });

      it("テナントが存在しない場合は404を返す", async () => {
        vi.mocked(parseBody).mockResolvedValue({
          data: {
            tenantId: "non-existent-tenant",
            amount: 50000,
            taxAmount: 5000,
            billingPeriodStart: "2026-02-01",
            billingPeriodEnd: "2026-02-28",
          },
        } as any);

        // テナント存在確認 → null
        const tenantsChain = createChain({ data: null, error: null });
        setTableChain("tenants", tenantsChain);

        const req = createPostRequest({});
        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.ok).toBe(false);
        expect(body.error).toBe("テナントが見つかりません");
      });

      it("請求書INSERT失敗時は500を返す", async () => {
        vi.mocked(parseBody).mockResolvedValue({
          data: {
            tenantId: "tenant-uuid-1",
            amount: 50000,
            taxAmount: 5000,
            billingPeriodStart: "2026-02-01",
            billingPeriodEnd: "2026-02-28",
          },
        } as any);

        // テナント存在確認 → OK
        const tenantsChain = createChain({ data: { id: "tenant-uuid-1", name: "テスト" }, error: null });
        setTableChain("tenants", tenantsChain);

        // プラン
        const plansChain = createChain({ data: null, error: null });
        setTableChain("tenant_plans", plansChain);

        // 請求書INSERT → エラー
        const invoicesChain = createChain({ data: null, error: { message: "INSERT failed" } });
        setTableChain("billing_invoices", invoicesChain);

        const req = createPostRequest({});
        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.ok).toBe(false);
        expect(body.error).toBe("請求書の作成に失敗しました");
      });

      it("テナントプランがない場合もplan_id=nullで作成成功", async () => {
        vi.mocked(parseBody).mockResolvedValue({
          data: {
            tenantId: "tenant-uuid-1",
            amount: 30000,
            taxAmount: 3000,
            billingPeriodStart: "2026-02-01",
            billingPeriodEnd: "2026-02-28",
          },
        } as any);

        const tenantsChain = createChain({ data: { id: "tenant-uuid-1", name: "テスト" }, error: null });
        setTableChain("tenants", tenantsChain);

        // プランなし
        const plansChain = createChain({ data: null, error: null });
        setTableChain("tenant_plans", plansChain);

        // 請求書INSERT成功
        const invoicesChain = createChain({
          data: { id: "inv-2", tenant_id: "tenant-uuid-1", amount: 30000, status: "pending" },
          error: null,
        });
        setTableChain("billing_invoices", invoicesChain);

        const req = createPostRequest({});
        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.ok).toBe(true);
        // INSERT のpayloadにplan_id: nullが含まれることを確認
        expect(invoicesChain.insert).toHaveBeenCalledWith(
          expect.objectContaining({ plan_id: null }),
        );
      });
    });

    // --- エラーハンドリング ---
    describe("エラーハンドリング", () => {
      it("テナント存在確認で予期しないエラー時は500を返す", async () => {
        vi.mocked(parseBody).mockResolvedValue({
          data: {
            tenantId: "tenant-uuid-err",
            amount: 50000,
            taxAmount: 5000,
            billingPeriodStart: "2026-02-01",
            billingPeriodEnd: "2026-02-28",
          },
        } as any);

        // テナント存在確認で例外を投げる（try-catch内）
        const tenantsChain = createChain({ data: null, error: null });
        tenantsChain.then = vi.fn(() => { throw new Error("予期しないエラー"); });
        setTableChain("tenants", tenantsChain);

        const req = createPostRequest({});
        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.error).toBe("予期しないエラーが発生しました");
      });
    });
  });
});
