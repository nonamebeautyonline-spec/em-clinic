// __tests__/api/test-cron-failure.test.ts
// Cron失敗テスト送信APIのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

const mockGetSetting = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/settings", () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
}));

const mockPushMessage = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/line-push", () => ({
  pushMessage: (...args: unknown[]) => mockPushMessage(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue(null),
  resolveTenantIdOrThrow: vi.fn(() => null),
}));

const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

// --- インポート ---
import { POST } from "@/app/api/admin/notifications/test-cron-failure/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

function makeReq() {
  return new NextRequest("http://localhost/api/admin/notifications/test-cron-failure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/admin/notifications/test-cron-failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);
    mockGetSetting.mockResolvedValue(null);
    mockPushMessage.mockResolvedValue({ ok: true });
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("認証失敗時は401を返す", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("通知先未設定時は400を返す", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("未設定");
  });

  it("Slack Webhook設定時にSlackにテスト送信する", async () => {
    mockGetSetting.mockImplementation((_cat: string, key: string) => {
      if (key === "cron_slack_webhook_url") return Promise.resolve("https://hooks.slack.com/services/test");
      return Promise.resolve(null);
    });

    const res = await POST(makeReq());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.results.slack).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("LINE UID設定時にLINEにテスト送信する", async () => {
    mockGetSetting.mockImplementation((_cat: string, key: string) => {
      if (key === "cron_notify_line_uid") return Promise.resolve("U_admin_001");
      return Promise.resolve(null);
    });

    const res = await POST(makeReq());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.results.line).toBe(true);
    expect(mockPushMessage).toHaveBeenCalledOnce();
  });

  it("両方設定時に両方にテスト送信する", async () => {
    mockGetSetting.mockImplementation((_cat: string, key: string) => {
      if (key === "cron_slack_webhook_url") return Promise.resolve("https://hooks.slack.com/services/test");
      if (key === "cron_notify_line_uid") return Promise.resolve("U_admin_001");
      return Promise.resolve(null);
    });

    const res = await POST(makeReq());
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.results.slack).toBe(true);
    expect(json.results.line).toBe(true);
  });
});
