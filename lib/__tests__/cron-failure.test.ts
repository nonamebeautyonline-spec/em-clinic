// lib/__tests__/cron-failure.test.ts
// Cron失敗通知のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---
const mockCheckRateLimit = vi.fn().mockResolvedValue({ limited: false, remaining: 1 });
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

const mockGetSetting = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/settings", () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
}));

const mockPushMessage = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/line-push", () => ({
  pushMessage: (...args: unknown[]) => mockPushMessage(...args),
}));

const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

// --- インポート ---
import { notifyCronFailure } from "@/lib/notifications/cron-failure";

describe("notifyCronFailure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ limited: false, remaining: 1 });
    mockGetSetting.mockResolvedValue(null);
    mockPushMessage.mockResolvedValue({ ok: true });
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("Slack Webhook URLが設定されている場合、Slackに通知を送信する", async () => {
    mockGetSetting.mockImplementation((_cat: string, key: string) => {
      if (key === "cron_slack_webhook_url") return Promise.resolve("https://hooks.slack.com/services/test");
      return Promise.resolve(null);
    });

    await notifyCronFailure("test-cron", new Error("テストエラー"));

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://hooks.slack.com/services/test");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.text).toContain("test-cron");
  });

  it("LINE UIDが設定されている場合、LINEに通知を送信する", async () => {
    mockGetSetting.mockImplementation((_cat: string, key: string) => {
      if (key === "cron_notify_line_uid") return Promise.resolve("U_admin_001");
      return Promise.resolve(null);
    });

    await notifyCronFailure("test-cron", new Error("テストエラー"));

    expect(mockPushMessage).toHaveBeenCalledOnce();
    const [uid, messages] = mockPushMessage.mock.calls[0];
    expect(uid).toBe("U_admin_001");
    expect(messages[0].text).toContain("test-cron");
    expect(messages[0].text).toContain("テストエラー");
  });

  it("Slack + LINE 両方設定されている場合、両方に通知する", async () => {
    mockGetSetting.mockImplementation((_cat: string, key: string) => {
      if (key === "cron_slack_webhook_url") return Promise.resolve("https://hooks.slack.com/services/test");
      if (key === "cron_notify_line_uid") return Promise.resolve("U_admin_001");
      return Promise.resolve(null);
    });

    await notifyCronFailure("test-cron", new Error("テストエラー"));

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockPushMessage).toHaveBeenCalledOnce();
  });

  it("レート制限中の場合、通知をスキップする", async () => {
    mockCheckRateLimit.mockResolvedValue({ limited: true, remaining: 0, retryAfter: 300 });
    mockGetSetting.mockResolvedValue("https://hooks.slack.com/services/test");

    await notifyCronFailure("test-cron", new Error("テストエラー"));

    // 通知はスキップされる
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPushMessage).not.toHaveBeenCalled();
  });

  it("レート制限キーにcronNameが含まれる", async () => {
    mockGetSetting.mockImplementation((_cat: string, key: string) => {
      if (key === "cron_slack_webhook_url") return Promise.resolve("https://hooks.slack.com/services/test");
      return Promise.resolve(null);
    });

    await notifyCronFailure("send-scheduled", new Error("DB error"));

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "cron-failure:send-scheduled",
      1,
      600,
    );
  });

  it("通知先が未設定の場合、何も送信しない", async () => {
    await notifyCronFailure("test-cron", new Error("テストエラー"));

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPushMessage).not.toHaveBeenCalled();
  });

  it("tenantIdが渡された場合、設定取得とLINE送信にtenantIdが使われる", async () => {
    const tenantId = "tenant-123";
    mockGetSetting.mockImplementation((_cat: string, key: string) => {
      if (key === "cron_notify_line_uid") return Promise.resolve("U_admin_001");
      return Promise.resolve(null);
    });

    await notifyCronFailure("test-cron", "string error", tenantId);

    // getSetting にtenantIdが渡される
    expect(mockGetSetting).toHaveBeenCalledWith("notification", "cron_slack_webhook_url", tenantId);
    expect(mockGetSetting).toHaveBeenCalledWith("notification", "cron_notify_line_uid", tenantId);
    // pushMessage にtenantIdが渡される
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U_admin_001",
      expect.any(Array),
      tenantId,
    );
  });

  it("Errorオブジェクト以外のエラーも文字列化して送信する", async () => {
    mockGetSetting.mockImplementation((_cat: string, key: string) => {
      if (key === "cron_notify_line_uid") return Promise.resolve("U_admin_001");
      return Promise.resolve(null);
    });

    await notifyCronFailure("test-cron", "文字列エラー");

    const [, messages] = mockPushMessage.mock.calls[0];
    expect(messages[0].text).toContain("文字列エラー");
  });

  it("Slack送信が失敗してもLINE送信は実行される", async () => {
    mockGetSetting.mockImplementation((_cat: string, key: string) => {
      if (key === "cron_slack_webhook_url") return Promise.resolve("https://hooks.slack.com/services/test");
      if (key === "cron_notify_line_uid") return Promise.resolve("U_admin_001");
      return Promise.resolve(null);
    });
    mockFetch.mockRejectedValue(new Error("Slack接続エラー"));

    await notifyCronFailure("test-cron", new Error("テスト"));

    // Slackは失敗するがLINEは送信される
    expect(mockPushMessage).toHaveBeenCalledOnce();
  });

  it("fire-and-forget: 通知処理自体がエラーでも例外をスローしない", async () => {
    mockCheckRateLimit.mockRejectedValue(new Error("Redis障害"));

    // 例外をスローしないことを確認
    await expect(notifyCronFailure("test-cron", new Error("テスト"))).resolves.toBeUndefined();
  });
});
