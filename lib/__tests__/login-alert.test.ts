// lib/__tests__/login-alert.test.ts
// ログインアラート（lib/notifications/login-alert.ts）の単体テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase モック ---
function createChain() {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.not = vi.fn().mockResolvedValue({ data: [], error: null });
  return chain;
}

let mockChain = createChain();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== "admin_sessions")
        throw new Error(`unexpected table: ${table}`);
      return mockChain;
    },
  },
}));

// --- sendEmail モック ---
const mockSendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

import { sendLoginAlertIfNewIp } from "@/lib/notifications/login-alert";

const BASE_PARAMS = {
  adminUserId: "user-123",
  email: "admin@example.com",
  name: "田中太郎",
  ipAddress: "203.0.113.50",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
};

// === sendLoginAlertIfNewIp テスト ===
describe("sendLoginAlertIfNewIp — ログインアラート", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createChain();
  });

  it("初回ログイン（過去セッションなし）→ メール送信しない", async () => {
    // 過去セッション: 空配列
    mockChain.not.mockResolvedValue({ data: [], error: null });

    await sendLoginAlertIfNewIp(BASE_PARAMS);

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("同じIPからのログイン → メール送信しない", async () => {
    // 過去セッションに同じIPが存在
    mockChain.not.mockResolvedValue({
      data: [{ ip_address: "203.0.113.50" }],
      error: null,
    });

    await sendLoginAlertIfNewIp(BASE_PARAMS);

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("新しいIPからのログイン → メール送信する", async () => {
    // 過去セッションには別のIPのみ
    mockChain.not.mockResolvedValue({
      data: [
        { ip_address: "192.168.1.1" },
        { ip_address: "10.0.0.1" },
      ],
      error: null,
    });

    await sendLoginAlertIfNewIp(BASE_PARAMS);

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@example.com",
        subject: expect.stringContaining("新しいIPアドレスからのログイン"),
      }),
    );
  });

  it("メールHTMLにIP・名前・ブラウザ情報が含まれる", async () => {
    mockChain.not.mockResolvedValue({
      data: [{ ip_address: "192.168.1.1" }],
      error: null,
    });

    await sendLoginAlertIfNewIp(BASE_PARAMS);

    const sendArg = mockSendEmail.mock.calls[0][0];
    expect(sendArg.html).toContain("203.0.113.50");
    expect(sendArg.html).toContain("田中太郎");
    expect(sendArg.html).toContain("Mozilla/5.0");
    expect(sendArg.html).toContain("心当たりがない場合");
  });

  it("userAgent が null の場合は「不明」と表示", async () => {
    mockChain.not.mockResolvedValue({
      data: [{ ip_address: "192.168.1.1" }],
      error: null,
    });

    await sendLoginAlertIfNewIp({ ...BASE_PARAMS, userAgent: null });

    const sendArg = mockSendEmail.mock.calls[0][0];
    expect(sendArg.html).toContain("不明");
  });

  it("メール送信失敗でもエラーを投げない（fire-and-forget）", async () => {
    mockChain.not.mockResolvedValue({
      data: [{ ip_address: "192.168.1.1" }],
      error: null,
    });
    mockSendEmail.mockRejectedValue(new Error("Resend APIエラー"));

    // エラーが投げられないことを確認
    await expect(
      sendLoginAlertIfNewIp(BASE_PARAMS),
    ).resolves.toBeUndefined();
  });

  it("DBエラーでもエラーを投げない（fire-and-forget）", async () => {
    mockChain.not.mockRejectedValue(new Error("DB接続エラー"));

    await expect(
      sendLoginAlertIfNewIp(BASE_PARAMS),
    ).resolves.toBeUndefined();
  });

  it("過去30日のセッションのみ参照する", async () => {
    mockChain.not.mockResolvedValue({ data: [], error: null });

    await sendLoginAlertIfNewIp(BASE_PARAMS);

    // gte が created_at フィルタとして呼ばれていること
    expect(mockChain.gte).toHaveBeenCalledWith(
      "created_at",
      expect.any(String),
    );

    // 30日前の日付であることを確認
    const gteArg = mockChain.gte.mock.calls[0][1];
    const gteDate = new Date(gteArg);
    const daysDiff = (Date.now() - gteDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThan(29);
    expect(daysDiff).toBeLessThan(31);
  });

  it("admin_user_id でフィルタリングする", async () => {
    mockChain.not.mockResolvedValue({ data: [], error: null });

    await sendLoginAlertIfNewIp(BASE_PARAMS);

    expect(mockChain.eq).toHaveBeenCalledWith("admin_user_id", "user-123");
  });
});
