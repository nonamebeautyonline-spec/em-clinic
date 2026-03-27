// __tests__/api/onboarding-concierge-detail.test.ts
// オンボーディングAIコンシェルジュ ストリーミングAPIのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// モック関数をhoistedで定義
const { mockVerifyAdminAuth, mockResolveTenantIdOrThrow, mockGetSettingOrEnv, mockStream } =
  vi.hoisted(() => {
    const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
    const mockResolveTenantIdOrThrow = vi.fn().mockReturnValue("tenant-001");
    const mockGetSettingOrEnv = vi.fn().mockResolvedValue("test-api-key");

    // Claude SDKストリーミングモック
    const mockStream = vi.fn();

    return {
      mockVerifyAdminAuth,
      mockResolveTenantIdOrThrow,
      mockGetSettingOrEnv,
      mockStream,
    };
  });

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: mockVerifyAdminAuth,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantIdOrThrow: mockResolveTenantIdOrThrow,
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: mockGetSettingOrEnv,
}));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { stream: mockStream };
  }
  return { default: MockAnthropic };
});

function createRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/onboarding/concierge/detail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/onboarding/concierge/detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockGetSettingOrEnv.mockResolvedValue("test-api-key");
    mockResolveTenantIdOrThrow.mockReturnValue("tenant-001");
  });

  it("未認証の場合は401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { POST } = await import(
      "@/app/api/admin/onboarding/concierge/detail/route"
    );
    const res = await POST(createRequest({ step: "line" }));

    expect(res.status).toBe(401);
  });

  it("不正なstepの場合は400を返す", async () => {
    const { POST } = await import(
      "@/app/api/admin/onboarding/concierge/detail/route"
    );
    const res = await POST(createRequest({ step: "invalid" }));

    expect(res.status).toBe(400);
  });

  it("stepが未指定の場合は400を返す", async () => {
    const { POST } = await import(
      "@/app/api/admin/onboarding/concierge/detail/route"
    );
    const res = await POST(createRequest({}));

    expect(res.status).toBe(400);
  });

  it("APIキー未設定時は500を返す", async () => {
    mockGetSettingOrEnv.mockResolvedValue("");

    const { POST } = await import(
      "@/app/api/admin/onboarding/concierge/detail/route"
    );
    const res = await POST(createRequest({ step: "line" }));

    expect(res.status).toBe(500);
  });

  it("有効なリクエストでtext/event-streamを返す", async () => {
    // ストリーミングレスポンスのモック（AsyncIterableを返す）
    const events = [
      { type: "content_block_delta", delta: { type: "text_delta", text: "こんにちは" } },
      { type: "content_block_delta", delta: { type: "text_delta", text: "、設定方法を" } },
      { type: "content_block_delta", delta: { type: "text_delta", text: "説明します。" } },
    ];

    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const event of events) {
          yield event;
        }
      },
    });

    const { POST } = await import(
      "@/app/api/admin/onboarding/concierge/detail/route"
    );
    const res = await POST(createRequest({ step: "line" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");

    // ストリームの内容を読み取り
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    // SSEフォーマットの検証
    expect(fullText).toContain("data: ");
    expect(fullText).toContain("こんにちは");
    expect(fullText).toContain("説明します。");
    expect(fullText).toContain("[DONE]");
  });

  it("全4ステップで正常にAPIが呼ばれる", async () => {
    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "テスト" } };
      },
    });

    const { POST } = await import(
      "@/app/api/admin/onboarding/concierge/detail/route"
    );

    for (const step of ["line", "payment", "products", "schedule"]) {
      const res = await POST(createRequest({ step }));
      expect(res.status).toBe(200);
    }
  });

  it("Claude APIエラー時もストリームでエラーを返す", async () => {
    mockStream.mockImplementation(() => {
      throw new Error("API rate limit exceeded");
    });

    const { POST } = await import(
      "@/app/api/admin/onboarding/concierge/detail/route"
    );
    const res = await POST(createRequest({ step: "line" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    expect(fullText).toContain("error");
    expect(fullText).toContain("API rate limit exceeded");
  });
});
