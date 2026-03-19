// lib/__tests__/webhook-failure.test.ts — Webhook失敗通知テスト

const mockCheckRateLimit = vi.fn();
const mockGetSetting = vi.fn();
const mockPushMessage = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock("@/lib/settings", () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: (...args: unknown[]) => mockPushMessage(...args),
}));

// グローバルfetchをモック
vi.stubGlobal("fetch", mockFetch);

import { notifyWebhookFailure } from "@/lib/notifications/webhook-failure";

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ limited: false, remaining: 0 });
  mockFetch.mockResolvedValue({ ok: true });
  mockPushMessage.mockResolvedValue(undefined);
});

describe("notifyWebhookFailure", () => {
  it("Slack + LINE両方に通知を送信する", async () => {
    mockGetSetting
      .mockResolvedValueOnce("https://hooks.slack.com/test") // slackWebhookUrl
      .mockResolvedValueOnce("U1234567890"); // lineNotifyUid

    await notifyWebhookFailure("square", "evt-123", new Error("timeout"));

    // Slack通知
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({ method: "POST" }),
    );

    // LINE通知
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U1234567890",
      expect.arrayContaining([
        expect.objectContaining({
          type: "text",
          text: expect.stringContaining("square"),
        }),
      ]),
      undefined,
    );
  });

  it("レート制限中はスキップする", async () => {
    mockCheckRateLimit.mockResolvedValue({ limited: true, remaining: 0 });

    await notifyWebhookFailure("gmo", "evt-456", new Error("fail"));

    expect(mockGetSetting).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPushMessage).not.toHaveBeenCalled();
  });

  it("通知先未設定でもエラーにならない", async () => {
    mockGetSetting.mockResolvedValue(null);

    await expect(
      notifyWebhookFailure("line", "evt-789", new Error("test")),
    ).resolves.not.toThrow();
  });

  it("レート制限キーにsource+eventIdが含まれる", async () => {
    mockGetSetting.mockResolvedValue(null);

    await notifyWebhookFailure("stripe", "evt-abc", new Error("err"));

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "webhook-failure:stripe:evt-abc",
      1,
      600,
    );
  });

  it("tenantIdを渡した場合LINE通知に含まれる", async () => {
    mockGetSetting
      .mockResolvedValueOnce(null) // slackなし
      .mockResolvedValueOnce("U999"); // LINEあり

    await notifyWebhookFailure("gmo", "evt-t", new Error("x"), "tenant-1");

    expect(mockPushMessage).toHaveBeenCalledWith(
      "U999",
      expect.any(Array),
      "tenant-1",
    );
  });

  it("Slack送信失敗でもLINE通知は実行される", async () => {
    mockGetSetting
      .mockResolvedValueOnce("https://hooks.slack.com/bad")
      .mockResolvedValueOnce("ULINE");
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    await notifyWebhookFailure("square", "evt-f", new Error("err"));

    // LINE通知は実行される
    expect(mockPushMessage).toHaveBeenCalled();
  });

  it("文字列エラーも処理できる", async () => {
    mockGetSetting
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("ULINE");

    await notifyWebhookFailure("line", "evt-str", "string error message");

    expect(mockPushMessage).toHaveBeenCalledWith(
      "ULINE",
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining("string error message"),
        }),
      ]),
      undefined,
    );
  });
});
