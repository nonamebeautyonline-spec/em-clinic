// lib/__tests__/ai-reply-sign.test.ts — AI返信ドラフト署名テスト

const TEST_KEY = "a".repeat(64); // 32バイトの16進文字列

describe("ai-reply-sign", () => {
  beforeEach(() => {
    process.env.SETTINGS_ENCRYPTION_KEY = TEST_KEY;
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  });

  // --- signDraftUrl ---

  describe("signDraftUrl", () => {
    it("同一入力で同一署名を生成する", async () => {
      const { signDraftUrl } = await import("@/lib/ai-reply-sign");
      const sig1 = signDraftUrl(1, 1000000);
      const sig2 = signDraftUrl(1, 1000000);
      expect(sig1).toBe(sig2);
    });

    it("異なるdraftIdで異なる署名を生成する", async () => {
      const { signDraftUrl } = await import("@/lib/ai-reply-sign");
      const sig1 = signDraftUrl(1, 1000000);
      const sig2 = signDraftUrl(2, 1000000);
      expect(sig1).not.toBe(sig2);
    });

    it("異なるexpiresAtで異なる署名を生成する", async () => {
      const { signDraftUrl } = await import("@/lib/ai-reply-sign");
      const sig1 = signDraftUrl(1, 1000000);
      const sig2 = signDraftUrl(1, 2000000);
      expect(sig1).not.toBe(sig2);
    });

    it("署名は32文字の16進文字列", async () => {
      const { signDraftUrl } = await import("@/lib/ai-reply-sign");
      const sig = signDraftUrl(1, 1000000);
      expect(sig).toHaveLength(32);
      expect(sig).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  // --- verifyDraftSignature ---

  describe("verifyDraftSignature", () => {
    it("正しい署名 → true", async () => {
      const { signDraftUrl, verifyDraftSignature } = await import("@/lib/ai-reply-sign");
      const expiresAt = Date.now() + 60000;
      const sig = signDraftUrl(1, expiresAt);
      expect(verifyDraftSignature(1, expiresAt, sig)).toBe(true);
    });

    it("改ざんされた署名 → false", async () => {
      const { signDraftUrl, verifyDraftSignature } = await import("@/lib/ai-reply-sign");
      const expiresAt = Date.now() + 60000;
      const sig = signDraftUrl(1, expiresAt);
      const tampered = (sig[0] === "a" ? "b" : "a") + sig.slice(1);
      expect(verifyDraftSignature(1, expiresAt, tampered)).toBe(false);
    });

    it("署名長が32文字でない → false", async () => {
      const { verifyDraftSignature } = await import("@/lib/ai-reply-sign");
      expect(verifyDraftSignature(1, Date.now() + 60000, "short")).toBe(false);
    });

    it("空文字列の署名 → false", async () => {
      const { verifyDraftSignature } = await import("@/lib/ai-reply-sign");
      expect(verifyDraftSignature(1, Date.now() + 60000, "")).toBe(false);
    });

    it("期限切れ → false", async () => {
      const { signDraftUrl, verifyDraftSignature } = await import("@/lib/ai-reply-sign");
      const expiresAt = Date.now() - 1000; // 過去
      const sig = signDraftUrl(1, expiresAt);
      expect(verifyDraftSignature(1, expiresAt, sig)).toBe(false);
    });
  });

  // --- buildEditUrl ---

  describe("buildEditUrl", () => {
    it("署名付きURLを正しい形式で生成する", async () => {
      const { buildEditUrl } = await import("@/lib/ai-reply-sign");
      const url = buildEditUrl(42, "https://example.com");
      expect(url).toContain("https://example.com/ai-reply/edit?id=42&exp=");
      expect(url).toContain("&sig=");
      // sig部分が32文字
      const sigMatch = url.match(/sig=([0-9a-f]+)$/);
      expect(sigMatch).not.toBeNull();
      expect(sigMatch![1]).toHaveLength(32);
    });

    it("有効期限が24時間後に設定される", async () => {
      const { buildEditUrl } = await import("@/lib/ai-reply-sign");
      const before = Date.now();
      const url = buildEditUrl(1, "https://test.com");
      const after = Date.now();
      const expMatch = url.match(/exp=(\d+)/);
      expect(expMatch).not.toBeNull();
      const exp = Number(expMatch![1]);
      const dayMs = 24 * 60 * 60 * 1000;
      expect(exp).toBeGreaterThanOrEqual(before + dayMs);
      expect(exp).toBeLessThanOrEqual(after + dayMs);
    });
  });
});
