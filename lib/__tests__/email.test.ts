// lib/__tests__/email.test.ts
// メール送信（lib/email.ts）の単体テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Resend モック ---
const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

// === sendPasswordResetEmail テスト ===
describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "test@noname-beauty.jp";
  });

  it("成功 → { success: true }", async () => {
    mockSend.mockResolvedValue({ error: null });

    const { sendPasswordResetEmail } = await import("@/lib/email");
    const result = await sendPasswordResetEmail("user@example.com", "https://example.com/reset?token=abc");

    expect(result).toEqual({ success: true });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["user@example.com"],
        subject: "【Lオペ for CLINIC】パスワードリセット",
      }),
    );
  });

  it("Resend APIエラー → { success: false, error }", async () => {
    mockSend.mockResolvedValue({ error: { message: "Invalid API key" } });

    const { sendPasswordResetEmail } = await import("@/lib/email");
    const result = await sendPasswordResetEmail("user@example.com", "https://example.com/reset");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid API key");
  });

  it("例外 → { success: false, error: 'メール送信に失敗しました' }", async () => {
    mockSend.mockRejectedValue(new Error("Network error"));

    const { sendPasswordResetEmail } = await import("@/lib/email");
    const result = await sendPasswordResetEmail("user@example.com", "https://example.com/reset");

    expect(result.success).toBe(false);
    expect(result.error).toBe("メール送信に失敗しました");
  });

  it("RESEND_API_KEY 未設定 → { success: false, error: 'メール設定が完了していません' }", async () => {
    delete process.env.RESEND_API_KEY;

    // 動的importをリセットするためにvi.resetModulesを使う
    vi.resetModules();
    // Resend再モック（リセット後に必要）
    vi.doMock("resend", () => ({
      Resend: class {
        emails = { send: mockSend };
      },
    }));

    const { sendPasswordResetEmail } = await import("@/lib/email");
    const result = await sendPasswordResetEmail("user@example.com", "https://example.com/reset");

    expect(result.success).toBe(false);
    expect(result.error).toBe("メール設定が完了していません");
  });

  it("HTMLにリセットURLが含まれる", async () => {
    mockSend.mockResolvedValue({ error: null });

    const { sendPasswordResetEmail } = await import("@/lib/email");
    await sendPasswordResetEmail("user@example.com", "https://example.com/reset?token=xyz");

    const sendArg = mockSend.mock.calls[0][0];
    expect(sendArg.html).toContain("https://example.com/reset?token=xyz");
    expect(sendArg.html).toContain("パスワードを再設定する");
    expect(sendArg.html).toContain("1時間有効");
  });
});

// === sendWelcomeEmail テスト ===
describe("sendWelcomeEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
  });

  it("成功 → { success: true }", async () => {
    mockSend.mockResolvedValue({ error: null });

    const { sendWelcomeEmail } = await import("@/lib/email");
    const result = await sendWelcomeEmail("admin@example.com", "山田太郎", "https://example.com/setup?token=abc");

    expect(result).toEqual({ success: true });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        subject: "【Lオペ for CLINIC】管理者アカウント作成",
      }),
    );
  });

  it("HTMLに名前とセットアップURLが含まれる", async () => {
    mockSend.mockResolvedValue({ error: null });

    const { sendWelcomeEmail } = await import("@/lib/email");
    await sendWelcomeEmail("admin@example.com", "田中花子", "https://example.com/setup?token=xyz");

    const sendArg = mockSend.mock.calls[0][0];
    expect(sendArg.html).toContain("田中花子");
    expect(sendArg.html).toContain("https://example.com/setup?token=xyz");
    expect(sendArg.html).toContain("パスワードを設定する");
    expect(sendArg.html).toContain("24時間有効");
  });

  it("APIエラー → { success: false }", async () => {
    mockSend.mockResolvedValue({ error: { message: "Rate limit exceeded" } });

    const { sendWelcomeEmail } = await import("@/lib/email");
    const result = await sendWelcomeEmail("admin@example.com", "Test", "https://example.com/setup");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rate limit exceeded");
  });
});
