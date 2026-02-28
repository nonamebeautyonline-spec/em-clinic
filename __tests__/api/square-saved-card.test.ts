// __tests__/api/square-saved-card.test.ts
// GET /api/square/saved-card のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モックチェーン ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq",
    "is", "not", "order", "limit", "maybeSingle", "single", "upsert",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((...args: any[]) => {
      const chains = (globalThis as any).__testTableChains || {};
      const table = args[0];
      if (!chains[table]) chains[table] = createChain();
      return chains[table];
    }),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(),
}));

vi.mock("@/lib/payment/square-inline", () => ({
  getCardDetails: vi.fn(),
}));

import { GET } from "@/app/api/square/saved-card/route";
import { getSettingOrEnv } from "@/lib/settings";
import { getCardDetails } from "@/lib/payment/square-inline";

function setTableChain(table: string, chain: any) {
  (globalThis as any).__testTableChains[table] = chain;
}

function createRequest(cookies: Record<string, string> = {}) {
  const req = new NextRequest("http://localhost:3000/api/square/saved-card");
  for (const [key, value] of Object.entries(cookies)) {
    req.cookies.set(key, value);
  }
  return req;
}

describe("GET /api/square/saved-card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__testTableChains = {};
    vi.mocked(getSettingOrEnv).mockImplementation(async (_cat, key) => {
      if (key === "access_token") return "sq-test-token";
      if (key === "env") return "sandbox";
      return "";
    });
  });

  it("patient_id Cookie がない場合は hasCard: false", async () => {
    const res = await GET(createRequest());
    const body = await res.json();
    expect(body.hasCard).toBe(false);
  });

  it("患者にカードが保存されていない場合は hasCard: false", async () => {
    const pChain = createChain({ data: { square_customer_id: null, square_card_id: null }, error: null });
    setTableChain("patients", pChain);

    const res = await GET(createRequest({ patient_id: "PID_001" }));
    const body = await res.json();
    expect(body.hasCard).toBe(false);
  });

  it("保存済みカードが有効な場合はカード情報を返す", async () => {
    const pChain = createChain({
      data: { square_customer_id: "CUST_1", square_card_id: "ccof:CARD_1" },
      error: null,
    });
    setTableChain("patients", pChain);

    vi.mocked(getCardDetails).mockResolvedValue({
      ok: true,
      card: {
        id: "ccof:CARD_1",
        card_brand: "VISA",
        last_4: "1234",
        exp_month: 12,
        exp_year: 2028,
        enabled: true,
      },
    });

    const res = await GET(createRequest({ patient_id: "PID_001" }));
    const body = await res.json();

    expect(body.hasCard).toBe(true);
    expect(body.cardId).toBe("ccof:CARD_1");
    expect(body.brand).toBe("VISA");
    expect(body.last4).toBe("1234");
  });

  it("Square APIでカードが無効の場合は hasCard: false & DB削除", async () => {
    const pChain = createChain({
      data: { square_customer_id: "CUST_1", square_card_id: "ccof:CARD_OLD" },
      error: null,
    });
    setTableChain("patients", pChain);

    vi.mocked(getCardDetails).mockResolvedValue({
      ok: true,
      card: { id: "ccof:CARD_OLD", enabled: false },
    });

    const res = await GET(createRequest({ patient_id: "PID_001" }));
    const body = await res.json();

    expect(body.hasCard).toBe(false);
    // updateが呼ばれている（square_card_id: null に更新）
    expect(pChain.update).toHaveBeenCalled();
  });

  it("Square API エラー時は hasCard: false", async () => {
    const pChain = createChain({
      data: { square_customer_id: "CUST_1", square_card_id: "ccof:CARD_1" },
      error: null,
    });
    setTableChain("patients", pChain);

    vi.mocked(getCardDetails).mockRejectedValue(new Error("network error"));

    const res = await GET(createRequest({ patient_id: "PID_001" }));
    const body = await res.json();
    expect(body.hasCard).toBe(false);
  });

  it("accessToken 未設定時は hasCard: false", async () => {
    const pChain = createChain({
      data: { square_customer_id: "CUST_1", square_card_id: "ccof:CARD_1" },
      error: null,
    });
    setTableChain("patients", pChain);

    vi.mocked(getSettingOrEnv).mockResolvedValue(undefined);

    const res = await GET(createRequest({ patient_id: "PID_001" }));
    const body = await res.json();
    expect(body.hasCard).toBe(false);
  });
});
