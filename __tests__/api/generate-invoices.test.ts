// __tests__/api/generate-invoices.test.ts
// 月次超過料金請求書生成Cron APIテスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// モック
vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: vi.fn(),
}));

vi.mock("@/lib/generate-invoice", () => ({
  generateOverageInvoice: vi.fn(),
}));

const mockTenantsSelect = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "tenants") {
        return {
          select: vi.fn(() => ({
            eq: mockTenantsSelect,
          })),
        };
      }
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })),
      };
    }),
  },
}));

import { acquireLock } from "@/lib/distributed-lock";
import { generateOverageInvoice } from "@/lib/generate-invoice";
import { GET } from "@/app/api/cron/generate-invoices/route";

const mockAcquireLock = acquireLock as ReturnType<typeof vi.fn>;
const mockGenerateInvoice = generateOverageInvoice as ReturnType<typeof vi.fn>;

function createRequest(secret = "test-secret"): NextRequest {
  return new NextRequest("http://localhost/api/cron/generate-invoices", {
    method: "GET",
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("GET /api/cron/generate-invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("認証失敗時は401を返す", async () => {
    const req = createRequest("wrong-secret");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("ロック取得失敗時はスキップ", async () => {
    mockAcquireLock.mockResolvedValue({ acquired: false });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.skipped).toBe(true);
    expect(data.message).toContain("別のインスタンス");
  });

  it("テナント取得エラー時は500を返す", async () => {
    mockAcquireLock.mockResolvedValue({ acquired: true, release: vi.fn() });
    mockTenantsSelect.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const res = await GET(createRequest());
    expect(res.status).toBe(500);
  });

  it("テナントなしの場合は空の結果を返す", async () => {
    const mockRelease = vi.fn();
    mockAcquireLock.mockResolvedValue({ acquired: true, release: mockRelease });
    mockTenantsSelect.mockResolvedValue({ data: [], error: null });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.total).toBe(0);
    expect(mockRelease).toHaveBeenCalled();
  });

  it("正常系: 全テナントの請求書を生成", async () => {
    const mockRelease = vi.fn();
    mockAcquireLock.mockResolvedValue({ acquired: true, release: mockRelease });
    mockTenantsSelect.mockResolvedValue({
      data: [{ id: "t1" }, { id: "t2" }, { id: "t3" }],
      error: null,
    });

    mockGenerateInvoice
      .mockResolvedValueOnce({
        status: "generated",
        tenantId: "t1",
        overageAmount: 1000,
        stripeInvoiceId: "inv_1",
      })
      .mockResolvedValueOnce({
        status: "skipped_no_overage",
        tenantId: "t2",
        overageAmount: 0,
      })
      .mockResolvedValueOnce({
        status: "skipped_no_customer",
        tenantId: "t3",
      });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.total).toBe(3);
    expect(data.generated).toBe(1);
    expect(data.skipped_no_overage).toBe(1);
    expect(data.skipped_no_customer).toBe(1);
    expect(data.errors).toBe(0);
    expect(mockRelease).toHaveBeenCalled();
    expect(mockGenerateInvoice).toHaveBeenCalledTimes(3);
  });

  it("一部テナントでエラーが発生しても他は処理を継続", async () => {
    const mockRelease = vi.fn();
    mockAcquireLock.mockResolvedValue({ acquired: true, release: mockRelease });
    mockTenantsSelect.mockResolvedValue({
      data: [{ id: "t1" }, { id: "t2" }],
      error: null,
    });

    mockGenerateInvoice
      .mockResolvedValueOnce({
        status: "generated",
        tenantId: "t1",
      })
      .mockRejectedValueOnce(new Error("Stripe接続エラー"));

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.total).toBe(2);
    expect(data.generated).toBe(1);
    expect(data.errors).toBe(1);
    expect(data.errorDetails).toHaveLength(1);
    expect(data.errorDetails[0].tenantId).toBe("t2");
    expect(data.errorDetails[0].error).toContain("Stripe接続エラー");
  });

  it("冪等: 全テナントが既に生成済みの場合", async () => {
    const mockRelease = vi.fn();
    mockAcquireLock.mockResolvedValue({ acquired: true, release: mockRelease });
    mockTenantsSelect.mockResolvedValue({
      data: [{ id: "t1" }],
      error: null,
    });

    mockGenerateInvoice.mockResolvedValueOnce({
      status: "skipped_already_generated",
      tenantId: "t1",
    });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.skipped_already_generated).toBe(1);
    expect(data.generated).toBe(0);
  });

  it("月の文字列が前月になっている", async () => {
    const mockRelease = vi.fn();
    mockAcquireLock.mockResolvedValue({ acquired: true, release: mockRelease });
    mockTenantsSelect.mockResolvedValue({
      data: [{ id: "t1" }],
      error: null,
    });

    mockGenerateInvoice.mockResolvedValueOnce({
      status: "skipped_no_overage",
      tenantId: "t1",
    });

    const res = await GET(createRequest());
    const data = await res.json();

    // レスポンスの month が前月であること
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const expectedMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
    expect(data.month).toBe(expectedMonth);
  });
});
