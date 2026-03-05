// lib/__tests__/generate-invoice.test.ts
// 超過料金Stripe請求書生成ロジック 単体テスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// Stripe モック
const mockInvoicesCreate = vi.fn();
const mockInvoiceItemsCreate = vi.fn();
const mockInvoicesFinalizeInvoice = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripeClient: vi.fn(),
}));

vi.mock("@/lib/usage", () => ({
  getMonthUsage: vi.fn(),
}));

// Supabase モック
const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { generateOverageInvoice } from "@/lib/generate-invoice";
import { getStripeClient } from "@/lib/stripe";
import { getMonthUsage } from "@/lib/usage";

const mockGetStripe = getStripeClient as ReturnType<typeof vi.fn>;
const mockGetMonthUsage = getMonthUsage as ReturnType<typeof vi.fn>;

// テスト用のテナントID
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

function makeStripeClient() {
  return {
    invoices: {
      create: mockInvoicesCreate,
      finalizeInvoice: mockInvoicesFinalizeInvoice,
    },
    invoiceItems: {
      create: mockInvoiceItemsCreate,
    },
  };
}

// Supabase チェーンモック用ヘルパー
function setupSupabaseMock(config: {
  monthlyUsage?: { data: unknown; error?: unknown };
  tenantPlan?: { data: unknown; error?: unknown };
  updateResult?: { data: unknown; error?: unknown };
  insertResult?: { data: unknown; error?: unknown };
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "monthly_usage") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue(
                config.monthlyUsage ?? { data: null, error: null },
              ),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue(
            config.updateResult ?? { data: null, error: null },
          ),
        })),
      };
    }
    if (table === "tenant_plans") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue(
                config.tenantPlan ?? { data: null, error: null },
              ),
            })),
          })),
        })),
      };
    }
    if (table === "billing_invoices") {
      return {
        insert: vi.fn().mockResolvedValue(
          config.insertResult ?? { data: null, error: null },
        ),
      };
    }
    return {
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })),
    };
  });
}

describe("generateOverageInvoice", () => {
  const targetDate = new Date(2026, 1, 15); // 2026年2月

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invoice_generated=true の場合は skipped_already_generated を返す", async () => {
    setupSupabaseMock({
      monthlyUsage: {
        data: { id: "u1", overage_amount: 1000, invoice_generated: true },
      },
    });

    const result = await generateOverageInvoice(TENANT_ID, targetDate);
    expect(result.status).toBe("skipped_already_generated");
    expect(result.tenantId).toBe(TENANT_ID);
  });

  it("超過なしの場合は skipped_no_overage を返し、invoice_generated を true に更新", async () => {
    setupSupabaseMock({
      monthlyUsage: {
        data: { id: "u1", overage_amount: 0, invoice_generated: false },
      },
    });

    const result = await generateOverageInvoice(TENANT_ID, targetDate);
    expect(result.status).toBe("skipped_no_overage");
    expect(result.overageAmount).toBe(0);
    // monthly_usage の update が呼ばれた
    expect(mockFrom).toHaveBeenCalledWith("monthly_usage");
  });

  it("monthly_usage がない場合はリアルタイム計算にフォールバック", async () => {
    setupSupabaseMock({
      monthlyUsage: { data: null },
    });
    mockGetMonthUsage.mockResolvedValue({
      tenantId: TENANT_ID,
      overageAmount: 0,
    });

    const result = await generateOverageInvoice(TENANT_ID, targetDate);
    expect(result.status).toBe("skipped_no_overage");
    expect(mockGetMonthUsage).toHaveBeenCalledWith(TENANT_ID, targetDate);
  });

  it("Stripe 未設定の場合は skipped_no_stripe を返す", async () => {
    setupSupabaseMock({
      monthlyUsage: {
        data: { id: "u1", overage_amount: 500, invoice_generated: false },
      },
    });
    mockGetStripe.mockResolvedValue(null);

    const result = await generateOverageInvoice(TENANT_ID, targetDate);
    expect(result.status).toBe("skipped_no_stripe");
  });

  it("stripe_customer_id なしの場合は skipped_no_customer を返す", async () => {
    setupSupabaseMock({
      monthlyUsage: {
        data: { id: "u1", overage_amount: 500, invoice_generated: false },
      },
      tenantPlan: { data: { id: "p1", stripe_customer_id: null } },
    });
    mockGetStripe.mockResolvedValue(makeStripeClient());

    const result = await generateOverageInvoice(TENANT_ID, targetDate);
    expect(result.status).toBe("skipped_no_customer");
  });

  it("正常系: 超過料金の請求書を生成する", async () => {
    setupSupabaseMock({
      monthlyUsage: {
        data: { id: "u1", overage_amount: 1000, invoice_generated: false },
      },
      tenantPlan: {
        data: { id: "p1", stripe_customer_id: "cus_test123" },
      },
    });

    mockGetStripe.mockResolvedValue(makeStripeClient());
    mockInvoicesCreate.mockResolvedValue({
      id: "inv_test123",
      number: "INV-2026-02-001",
    });
    mockInvoiceItemsCreate.mockResolvedValue({});
    mockInvoicesFinalizeInvoice.mockResolvedValue({});

    const result = await generateOverageInvoice(TENANT_ID, targetDate);

    expect(result.status).toBe("generated");
    expect(result.overageAmount).toBe(1000);
    expect(result.stripeInvoiceId).toBe("inv_test123");

    // Stripe Invoice が作成された
    expect(mockInvoicesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_test123",
        collection_method: "charge_automatically",
      }),
    );

    // InvoiceItem が作成された（税込 1100円 = 1000 + 100）
    expect(mockInvoiceItemsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_test123",
        invoice: "inv_test123",
        amount: 1100, // 1000 + 消費税100
        currency: "jpy",
      }),
    );

    // Invoice が確定された
    expect(mockInvoicesFinalizeInvoice).toHaveBeenCalledWith(
      "inv_test123",
      expect.objectContaining({ auto_advance: true }),
    );

    // billing_invoices に INSERT された
    expect(mockFrom).toHaveBeenCalledWith("billing_invoices");
  });

  it("消費税は10%切り上げで計算される", async () => {
    setupSupabaseMock({
      monthlyUsage: {
        data: { id: "u1", overage_amount: 333, invoice_generated: false },
      },
      tenantPlan: {
        data: { id: "p1", stripe_customer_id: "cus_test" },
      },
    });

    mockGetStripe.mockResolvedValue(makeStripeClient());
    mockInvoicesCreate.mockResolvedValue({
      id: "inv_tax",
      number: "INV-TAX",
    });
    mockInvoiceItemsCreate.mockResolvedValue({});
    mockInvoicesFinalizeInvoice.mockResolvedValue({});

    const result = await generateOverageInvoice(TENANT_ID, targetDate);

    expect(result.status).toBe("generated");
    // 333 * 0.1 = 33.3 → 切り上げ = 34、合計 = 367
    expect(mockInvoiceItemsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 367,
      }),
    );
  });

  it("Stripe API エラー時は error ステータスを返す", async () => {
    setupSupabaseMock({
      monthlyUsage: {
        data: { id: "u1", overage_amount: 500, invoice_generated: false },
      },
      tenantPlan: {
        data: { id: "p1", stripe_customer_id: "cus_err" },
      },
    });

    mockGetStripe.mockResolvedValue(makeStripeClient());
    mockInvoicesCreate.mockRejectedValue(new Error("Stripe API error"));

    const result = await generateOverageInvoice(TENANT_ID, targetDate);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Stripe API error");
  });
});
