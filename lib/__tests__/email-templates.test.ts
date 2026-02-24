// lib/__tests__/email-templates.test.ts
// メールテンプレート関数（テナント招待・請求通知・使用量警告）のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Resend モック ---
const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

// 動的インポート（モック設定後）
const {
  sendTenantInviteEmail,
  sendInvoiceNotificationEmail,
  sendUsageWarningEmail,
  sendWelcomeEmail,
} = await import("@/lib/email");

// === sendTenantInviteEmail テスト ===
describe("sendTenantInviteEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "test@l-ope.jp";
  });

  it("Resend APIを正しい引数で呼び出す", async () => {
    mockSend.mockResolvedValue({ error: null });

    await sendTenantInviteEmail(
      "new-member@example.com",
      "田中太郎",
      "テストクリニック",
      "https://example.com/invite?token=abc",
      "admin",
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    const arg = mockSend.mock.calls[0][0];
    expect(arg.to).toBe("new-member@example.com");
    expect(arg.subject).toContain("テストクリニック");
    expect(arg.subject).toContain("招待");
  });

  it("HTMLにテナント名・招待者名・招待URLが含まれる", async () => {
    mockSend.mockResolvedValue({ error: null });

    await sendTenantInviteEmail(
      "user@example.com",
      "山田花子",
      "ABCクリニック",
      "https://example.com/invite?token=xyz",
      "owner",
    );

    const arg = mockSend.mock.calls[0][0];
    expect(arg.html).toContain("山田花子");
    expect(arg.html).toContain("ABCクリニック");
    expect(arg.html).toContain("https://example.com/invite?token=xyz");
    expect(arg.html).toContain("招待を承認する");
  });

  it("roleがownerの場合、オーナーと表示される", async () => {
    mockSend.mockResolvedValue({ error: null });

    await sendTenantInviteEmail(
      "user@example.com",
      "管理者",
      "クリニック",
      "https://example.com/invite",
      "owner",
    );

    const arg = mockSend.mock.calls[0][0];
    expect(arg.html).toContain("オーナー");
  });

  it("roleがadminの場合、管理者と表示される", async () => {
    mockSend.mockResolvedValue({ error: null });

    await sendTenantInviteEmail(
      "user@example.com",
      "管理者",
      "クリニック",
      "https://example.com/invite",
      "admin",
    );

    const arg = mockSend.mock.calls[0][0];
    expect(arg.html).toContain("管理者として招待");
  });

  it("roleがmemberの場合、メンバーと表示される", async () => {
    mockSend.mockResolvedValue({ error: null });

    await sendTenantInviteEmail(
      "user@example.com",
      "管理者",
      "クリニック",
      "https://example.com/invite",
      "member",
    );

    const arg = mockSend.mock.calls[0][0];
    expect(arg.html).toContain("メンバー");
  });

  it("Resend APIエラー時に例外を投げる", async () => {
    mockSend.mockResolvedValue({ error: { message: "APIエラー" } });

    await expect(
      sendTenantInviteEmail(
        "user@example.com",
        "管理者",
        "クリニック",
        "https://example.com/invite",
        "admin",
      ),
    ).rejects.toThrow("メール送信に失敗しました");
  });

  it("RESEND_API_KEY未設定時に例外を投げる", async () => {
    delete process.env.RESEND_API_KEY;

    vi.resetModules();
    vi.doMock("resend", () => ({
      Resend: class {
        emails = { send: mockSend };
      },
    }));

    const { sendTenantInviteEmail: fn } = await import("@/lib/email");
    await expect(
      fn("user@example.com", "管理者", "クリニック", "https://example.com", "admin"),
    ).rejects.toThrow("メール設定が完了していません");
  });
});

// === sendInvoiceNotificationEmail テスト ===
describe("sendInvoiceNotificationEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "test@l-ope.jp";
  });

  it("Resend APIを正しい引数で呼び出す", async () => {
    mockSend.mockResolvedValue({ error: null });

    await sendInvoiceNotificationEmail(
      "billing@example.com",
      "テストクリニック",
      50000,
      "2026年2月",
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    const arg = mockSend.mock.calls[0][0];
    expect(arg.to).toBe("billing@example.com");
    expect(arg.subject).toContain("請求書");
    expect(arg.subject).toContain("テストクリニック");
  });

  it("HTMLに金額と請求期間が含まれる", async () => {
    mockSend.mockResolvedValue({ error: null });

    await sendInvoiceNotificationEmail(
      "billing@example.com",
      "ABCクリニック",
      123456,
      "2026年1月〜2月",
    );

    const arg = mockSend.mock.calls[0][0];
    expect(arg.html).toContain("123,456");
    expect(arg.html).toContain("2026年1月〜2月");
    expect(arg.html).toContain("ABCクリニック");
  });

  it("Resend APIエラー時に例外を投げる", async () => {
    mockSend.mockResolvedValue({ error: { message: "送信失敗" } });

    await expect(
      sendInvoiceNotificationEmail(
        "billing@example.com",
        "クリニック",
        50000,
        "2026年2月",
      ),
    ).rejects.toThrow("メール送信に失敗しました");
  });
});

// === sendUsageWarningEmail テスト ===
describe("sendUsageWarningEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "test@l-ope.jp";
  });

  it("75%警告メールを送信する", async () => {
    mockSend.mockResolvedValue({ error: null });

    await sendUsageWarningEmail(
      "admin@example.com",
      "テストクリニック",
      75,
      3750,
      5000,
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    const arg = mockSend.mock.calls[0][0];
    expect(arg.to).toBe("admin@example.com");
    expect(arg.subject).toContain("75%");
    expect(arg.subject).toContain("テストクリニック");
  });

  it("HTMLに使用量情報が含まれる", async () => {
    mockSend.mockResolvedValue({ error: null });

    await sendUsageWarningEmail(
      "admin@example.com",
      "ABCクリニック",
      75,
      3750,
      5000,
    );

    const arg = mockSend.mock.calls[0][0];
    expect(arg.html).toContain("3,750");
    expect(arg.html).toContain("5,000");
    expect(arg.html).toContain("75%");
    expect(arg.html).toContain("ABCクリニック");
  });

  it("100%到達時は上限到達メッセージが含まれる", async () => {
    mockSend.mockResolvedValue({ error: null });

    await sendUsageWarningEmail(
      "admin@example.com",
      "テストクリニック",
      100,
      5000,
      5000,
    );

    const arg = mockSend.mock.calls[0][0];
    expect(arg.subject).toContain("上限に到達しました");
    expect(arg.html).toContain("従量課金となります");
  });

  it("Resend APIエラー時に例外を投げる", async () => {
    mockSend.mockResolvedValue({ error: { message: "送信失敗" } });

    await expect(
      sendUsageWarningEmail(
        "admin@example.com",
        "クリニック",
        75,
        3750,
        5000,
      ),
    ).rejects.toThrow("メール送信に失敗しました");
  });
});

// === sendWelcomeEmail tenantName引数テスト ===
describe("sendWelcomeEmail (tenantName引数)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "test@l-ope.jp";
  });

  it("tenantName指定時、そのテナント名が表示される", async () => {
    mockSend.mockResolvedValue({ error: null });

    await sendWelcomeEmail(
      "admin@example.com",
      "山田太郎",
      "https://example.com/setup",
      "ABCクリニック",
    );

    const arg = mockSend.mock.calls[0][0];
    expect(arg.html).toContain("ABCクリニック");
    expect(arg.html).not.toContain("のなめビューティー");
  });

  it("tenantName未指定時、デフォルト名が表示される", async () => {
    mockSend.mockResolvedValue({ error: null });

    await sendWelcomeEmail(
      "admin@example.com",
      "山田太郎",
      "https://example.com/setup",
    );

    const arg = mockSend.mock.calls[0][0];
    expect(arg.html).toContain("Lオペ for CLINIC");
  });
});
