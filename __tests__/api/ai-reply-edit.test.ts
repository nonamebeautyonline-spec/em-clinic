// AI返信 修正→再生成ループのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック設定 ---
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/lib/ai-reply", () => ({
  sendAiReply: vi.fn().mockResolvedValue(undefined),
  buildSystemPrompt: vi.fn().mockReturnValue("system prompt"),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-value"),
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn((id) => ({ tenant_id: id })),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "再生成された返信テキスト" }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  })),
}));

// --- 署名テスト ---
describe("lib/ai-reply-sign", () => {
  beforeEach(() => {
    process.env.SETTINGS_ENCRYPTION_KEY = "a".repeat(64);
  });

  it("署名の生成と検証が一致する", async () => {
    // キャッシュクリア
    vi.resetModules();
    const { signDraftUrl, verifyDraftSignature } = await import("@/lib/ai-reply-sign");

    const draftId = 42;
    const expiresAt = Date.now() + 3600_000;
    const sig = signDraftUrl(draftId, expiresAt);

    expect(sig).toHaveLength(32);
    expect(verifyDraftSignature(draftId, expiresAt, sig)).toBe(true);
  });

  it("期限切れの署名は無効", async () => {
    vi.resetModules();
    const { signDraftUrl, verifyDraftSignature } = await import("@/lib/ai-reply-sign");

    const draftId = 42;
    const expiresAt = Date.now() - 1000; // 過去
    const sig = signDraftUrl(draftId, expiresAt);

    expect(verifyDraftSignature(draftId, expiresAt, sig)).toBe(false);
  });

  it("異なるdraftIdの署名は無効", async () => {
    vi.resetModules();
    const { signDraftUrl, verifyDraftSignature } = await import("@/lib/ai-reply-sign");

    const expiresAt = Date.now() + 3600_000;
    const sig = signDraftUrl(1, expiresAt);

    expect(verifyDraftSignature(2, expiresAt, sig)).toBe(false);
  });

  it("不正な署名は無効", async () => {
    vi.resetModules();
    const { verifyDraftSignature } = await import("@/lib/ai-reply-sign");

    const expiresAt = Date.now() + 3600_000;
    expect(verifyDraftSignature(1, expiresAt, "invalid")).toBe(false);
  });

  it("buildEditUrlが正しいURLを生成する", async () => {
    vi.resetModules();
    const { buildEditUrl } = await import("@/lib/ai-reply-sign");

    const url = buildEditUrl(42, "https://example.com");
    expect(url).toMatch(/^https:\/\/example\.com\/ai-reply\/edit\?id=42&exp=\d+&sig=[a-f0-9]{32}$/);
  });
});

// --- API テスト ---
describe("AI返信ドラフト取得API", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SETTINGS_ENCRYPTION_KEY = "a".repeat(64);
  });

  it("署名が無効なら403を返す", async () => {
    const { GET } = await import("@/app/api/ai-reply/[draftId]/route");
    const url = new URL("http://localhost/api/ai-reply/1?sig=invalid&exp=0");
    const req = new Request(url);
    // @ts-expect-error テスト用の簡略化されたrequest
    const res = await GET(req, { params: Promise.resolve({ draftId: "1" }) });
    expect(res.status).toBe(403);
  });
});

describe("AI返信ドラフト却下API", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SETTINGS_ENCRYPTION_KEY = "a".repeat(64);
  });

  it("署名が無効なら403を返す", async () => {
    const { POST } = await import("@/app/api/ai-reply/[draftId]/reject/route");
    const req = new Request("http://localhost/api/ai-reply/1/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sig: "invalid", exp: 0 }),
    });
    // @ts-expect-error テスト用
    const res = await POST(req, { params: Promise.resolve({ draftId: "1" }) });
    expect(res.status).toBe(403);
  });
});

describe("AI返信再生成API", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SETTINGS_ENCRYPTION_KEY = "a".repeat(64);
  });

  it("署名が無効なら403を返す", async () => {
    const { POST } = await import("@/app/api/ai-reply/[draftId]/regenerate/route");
    const req = new Request("http://localhost/api/ai-reply/1/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction: "test", sig: "invalid", exp: 0 }),
    });
    // @ts-expect-error テスト用
    const res = await POST(req, { params: Promise.resolve({ draftId: "1" }) });
    expect(res.status).toBe(403);
  });

  it("修正指示が空なら400を返す", async () => {
    const { signDraftUrl } = await import("@/lib/ai-reply-sign");
    const expTime = Date.now() + 3600_000;
    const sig = signDraftUrl(1, expTime);

    const { POST } = await import("@/app/api/ai-reply/[draftId]/regenerate/route");
    const req = new Request("http://localhost/api/ai-reply/1/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction: "", sig, exp: expTime }),
    });
    // @ts-expect-error テスト用
    const res = await POST(req, { params: Promise.resolve({ draftId: "1" }) });
    expect(res.status).toBe(400);
  });
});

describe("AI返信送信API", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SETTINGS_ENCRYPTION_KEY = "a".repeat(64);
  });

  it("署名が無効なら403を返す", async () => {
    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = new Request("http://localhost/api/ai-reply/1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sig: "invalid", exp: 0 }),
    });
    // @ts-expect-error テスト用
    const res = await POST(req, { params: Promise.resolve({ draftId: "1" }) });
    expect(res.status).toBe(403);
  });
});
