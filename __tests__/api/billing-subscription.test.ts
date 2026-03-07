// __tests__/api/billing-subscription.test.ts
// サブスクリプション管理API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モック定義 ---

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(),
}));

// Stripeモック
const mockSubscriptionsRetrieve = vi.fn();
const mockSubscriptionsUpdate = vi.fn();
const mockSubscriptionsCancel = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripeClient: vi.fn(() =>
    Promise.resolve({
      subscriptions: {
        retrieve: mockSubscriptionsRetrieve,
        update: mockSubscriptionsUpdate,
        cancel: mockSubscriptionsCancel,
      },
    }),
  ),
}));

// Supabaseモック
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle, eq: mockEq }));
const mockSelect = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/plan-config", () => ({
  getPlanByKey: vi.fn((key: string) => {
    const plans: Record<string, unknown> = {
      standard: {
        key: "standard",
        label: "スタンダード",
        messageQuota: 30000,
        monthlyPrice: 17000,
        overageUnitPrice: 0.7,
        stripePriceId: "",
      },
      pro: {
        key: "pro",
        label: "プロ",
        messageQuota: 50000,
        monthlyPrice: 26000,
        overageUnitPrice: 0.6,
        stripePriceId: "price_pro",
      },
      light: {
        key: "light",
        label: "ライト",
        messageQuota: 5000,
        monthlyPrice: 4000,
        overageUnitPrice: 1.0,
        stripePriceId: "",
      },
    };
    return plans[key] || undefined;
  }),
  MESSAGE_PLANS: [
    { key: "light", label: "ライト", messageQuota: 5000, monthlyPrice: 4000, overageUnitPrice: 1.0, stripePriceId: "" },
    { key: "standard", label: "スタンダード", messageQuota: 30000, monthlyPrice: 17000, overageUnitPrice: 0.7, stripePriceId: "" },
    { key: "pro", label: "プロ", messageQuota: 50000, monthlyPrice: 26000, overageUnitPrice: 0.6, stripePriceId: "price_pro" },
  ],
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ limited: false, remaining: 5 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: NextRequest, schema: { parse: (v: unknown) => unknown }) => {
    try {
      const raw = await req.json();
      const data = schema.parse(raw);
      return { data };
    } catch {
      const { NextResponse } = await import("next/server");
      return { error: NextResponse.json({ ok: false, error: "VALIDATION_ERROR", message: "入力値が不正です" }, { status: 400 }) };
    }
  }),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { checkRateLimit } from "@/lib/rate-limit";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;
const mockTenant = resolveTenantId as ReturnType<typeof vi.fn>;
const mockRateLimit = checkRateLimit as ReturnType<typeof vi.fn>;

// --- テスト ---

describe("GET /api/admin/billing/subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("テナント不明の場合400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue(null);
    const { GET } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("プラン情報がない場合404を返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    const { GET } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("認証済みでプランがある場合200を返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    // tenant_plans → single
    mockSingle.mockResolvedValueOnce({
      data: {
        plan_name: "standard",
        monthly_fee: 17000,
        setup_fee: 0,
        started_at: "2026-01-01",
        next_billing_at: "2026-04-01",
        status: "active",
        message_quota: 30000,
        overage_unit_price: 0.7,
        stripe_subscription_id: null,
        stripe_customer_id: null,
      },
      error: null,
    });
    // monthly_usage → single
    mockSingle.mockResolvedValueOnce({
      data: { message_count: 5000, ai_reply_count: 100, voice_input_count: 50 },
      error: null,
    });

    const { GET } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.subscription.planName).toBe("standard");
    expect(json.subscription.planLabel).toBe("スタンダード");
    expect(json.subscription.status).toBe("active");
    expect(json.availablePlans).toBeDefined();
    expect(json.availablePlans.length).toBeGreaterThan(0);
  });
});

describe("POST /api/admin/billing/subscription - プラン変更", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "change_plan", newPlanKey: "pro" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("テナント不明の場合400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue(null);
    const { POST } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "change_plan", newPlanKey: "pro" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("レート制限超過の場合429を返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockRateLimit.mockResolvedValue({ limited: true, remaining: 0, retryAfter: 30 });
    const { POST } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "change_plan", newPlanKey: "pro" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("無効なプランキーの場合400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockRateLimit.mockResolvedValue({ limited: false, remaining: 5 });
    const { POST } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "change_plan", newPlanKey: "invalid_plan" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("同じプランへの変更は400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockRateLimit.mockResolvedValue({ limited: false, remaining: 5 });
    // tenant_plans
    mockSingle.mockResolvedValueOnce({
      data: {
        plan_name: "standard",
        stripe_subscription_id: null,
        stripe_customer_id: null,
        status: "active",
      },
      error: null,
    });

    const { POST } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "change_plan", newPlanKey: "standard" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain("同じプラン");
  });

  it("Stripe未連携時にローカルDBのみ更新して200を返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockRateLimit.mockResolvedValue({ limited: false, remaining: 5 });
    // tenant_plans
    mockSingle.mockResolvedValueOnce({
      data: {
        plan_name: "standard",
        stripe_subscription_id: null,
        stripe_customer_id: null,
        status: "active",
      },
      error: null,
    });

    const { POST } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "change_plan", newPlanKey: "pro" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toContain("プロ");
    expect(json.newPlan.key).toBe("pro");
  });
});

describe("POST /api/admin/billing/subscription - 解約", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("期末解約の場合cancellingステータスを返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockRateLimit.mockResolvedValue({ limited: false, remaining: 5 });
    // tenant_plans
    mockSingle.mockResolvedValueOnce({
      data: {
        stripe_subscription_id: null,
        status: "active",
      },
      error: null,
    });

    const { POST } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "cancel", cancelAtPeriodEnd: true, reason: "コスト削減のため" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("cancelling");
    expect(json.message).toContain("解約予約");
  });

  it("即時解約の場合cancelledステータスを返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockRateLimit.mockResolvedValue({ limited: false, remaining: 5 });
    // tenant_plans
    mockSingle.mockResolvedValueOnce({
      data: {
        stripe_subscription_id: null,
        status: "active",
      },
      error: null,
    });

    const { POST } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "cancel", cancelAtPeriodEnd: false }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("cancelled");
    expect(json.message).toContain("即時解約");
  });

  it("既に解約済みの場合400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockRateLimit.mockResolvedValue({ limited: false, remaining: 5 });
    // tenant_plans
    mockSingle.mockResolvedValueOnce({
      data: {
        stripe_subscription_id: null,
        status: "cancelled",
      },
      error: null,
    });

    const { POST } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "cancel", cancelAtPeriodEnd: true }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain("解約済み");
  });
});

describe("DELETE /api/admin/billing/subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("テナント不明の場合400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue(null);
    const { DELETE } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("レート制限超過の場合429を返す", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockRateLimit.mockResolvedValue({ limited: true, remaining: 0 });
    const { DELETE } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(429);
  });

  it("即時解約（cancelAtPeriodEnd=false）で処理される", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockRateLimit.mockResolvedValue({ limited: false, remaining: 3 });
    // tenant_plans
    mockSingle.mockResolvedValueOnce({
      data: {
        stripe_subscription_id: null,
        status: "active",
      },
      error: null,
    });

    const { DELETE } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("cancelled");
  });
});

describe("POST /api/admin/billing/subscription - Stripe連携ありのプラン変更", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Stripe連携時にStripeサブスクリプションも更新する", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockRateLimit.mockResolvedValue({ limited: false, remaining: 5 });
    // tenant_plans
    mockSingle.mockResolvedValueOnce({
      data: {
        plan_name: "standard",
        stripe_subscription_id: "sub_123",
        stripe_customer_id: "cus_123",
        status: "active",
      },
      error: null,
    });

    // Stripe retrieve
    mockSubscriptionsRetrieve.mockResolvedValue({
      id: "sub_123",
      items: {
        data: [{ id: "si_item1", price: { product: "prod_123" } }],
      },
    });
    mockSubscriptionsUpdate.mockResolvedValue({ id: "sub_123" });

    const { POST } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "change_plan", newPlanKey: "pro" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    // Stripe APIが呼ばれたことを確認
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith("sub_123", expect.objectContaining({
      items: expect.arrayContaining([
        expect.objectContaining({ id: "si_item1", price: "price_pro" }),
      ]),
    }));
  });

  it("Stripe連携ありの期末解約時にcancel_at_period_endを設定する", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockRateLimit.mockResolvedValue({ limited: false, remaining: 5 });
    // tenant_plans
    mockSingle.mockResolvedValueOnce({
      data: {
        stripe_subscription_id: "sub_456",
        status: "active",
      },
      error: null,
    });

    mockSubscriptionsUpdate.mockResolvedValue({});

    const { POST } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "cancel", cancelAtPeriodEnd: true, reason: "コスト削減のため" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith("sub_456", {
      cancel_at_period_end: true,
      metadata: { cancel_reason: "コスト削減のため" },
    });
  });

  it("Stripe連携ありの即時解約時にsubscriptions.cancelを呼ぶ", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenant.mockReturnValue("tenant-1");
    mockRateLimit.mockResolvedValue({ limited: false, remaining: 5 });
    // tenant_plans
    mockSingle.mockResolvedValueOnce({
      data: {
        stripe_subscription_id: "sub_789",
        status: "active",
      },
      error: null,
    });

    mockSubscriptionsCancel.mockResolvedValue({});

    const { POST } = await import("@/app/api/admin/billing/subscription/route");
    const req = new NextRequest("http://localhost/api/admin/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "cancel", cancelAtPeriodEnd: false }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockSubscriptionsCancel).toHaveBeenCalledWith("sub_789");
  });
});
