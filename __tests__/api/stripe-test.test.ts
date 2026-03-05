// __tests__/api/stripe-test.test.ts
// Stripe接続テストAPI テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  testStripeConnection: vi.fn(),
}));

import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { testStripeConnection } from "@/lib/stripe";
import { POST } from "@/app/api/platform/system/stripe-test/route";

const mockAuth = verifyPlatformAdmin as ReturnType<typeof vi.fn>;
const mockTest = testStripeConnection as ReturnType<typeof vi.fn>;

function createRequest(): NextRequest {
  return new NextRequest("http://localhost/api/platform/system/stripe-test", {
    method: "POST",
  });
}

describe("POST /api/platform/system/stripe-test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合403を返す", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createRequest());
    expect(res.status).toBe(403);
  });

  it("接続成功時はokを返す", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockTest.mockResolvedValue({ ok: true, accountName: "Test" });
    const res = await POST(createRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.accountName).toBe("Test");
  });

  it("接続失敗時はエラーを返す", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockTest.mockResolvedValue({ ok: false, error: "Invalid key" });
    const res = await POST(createRequest());
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Invalid key");
  });
});
