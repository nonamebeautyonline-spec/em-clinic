// __tests__/api/report-settings.test.ts — 定期レポート設定APIテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

const mockGetSetting = vi.fn();
const mockSetSetting = vi.fn();
vi.mock("@/lib/settings", () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
  setSetting: (...args: unknown[]) => mockSetSetting(...args),
}));

const mockGenerateWeeklyReport = vi.fn();
vi.mock("@/lib/report-generator", () => ({
  generateWeeklyReport: (...args: unknown[]) => mockGenerateWeeklyReport(...args),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import { GET, PUT } from "@/app/api/admin/report-settings/route";

function createRequest(method: string, body?: unknown) {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request("http://localhost/api/admin/report-settings", init) as unknown as import("next/server").NextRequest;
}

describe("report-settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockSetSetting.mockResolvedValue(true);
  });

  describe("GET", () => {
    it("認証失敗で401を返す", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const res = await GET(createRequest("GET"));
      expect(res.status).toBe(401);
    });

    it("設定を返す", async () => {
      mockGetSetting.mockImplementation((_cat: string, key: string) => {
        if (key === "enabled") return "true";
        if (key === "frequency") return "monthly";
        if (key === "emails") return "a@b.com,c@d.com";
        return null;
      });

      const res = await GET(createRequest("GET"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.enabled).toBe(true);
      expect(data.frequency).toBe("monthly");
      expect(data.emails).toBe("a@b.com,c@d.com");
    });

    it("設定未登録時はデフォルト値を返す", async () => {
      mockGetSetting.mockResolvedValue(null);

      const res = await GET(createRequest("GET"));
      const data = await res.json();
      expect(data.enabled).toBe(false);
      expect(data.frequency).toBe("weekly");
      expect(data.emails).toBe("");
    });
  });

  describe("PUT", () => {
    it("認証失敗で401を返す", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const res = await PUT(createRequest("PUT", {
        enabled: true,
        frequency: "weekly",
        emails: "a@b.com",
      }));
      expect(res.status).toBe(401);
    });

    it("設定を保存する", async () => {
      const res = await PUT(createRequest("PUT", {
        enabled: true,
        frequency: "weekly",
        emails: "admin@test.com",
      }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(mockSetSetting).toHaveBeenCalledTimes(3);
    });

    it("無効なメールアドレスで400を返す", async () => {
      const res = await PUT(createRequest("PUT", {
        enabled: true,
        frequency: "weekly",
        emails: "invalid-email",
      }));
      expect(res.status).toBe(400);
    });

    it("有効化時にメールアドレスなしで400を返す", async () => {
      const res = await PUT(createRequest("PUT", {
        enabled: true,
        frequency: "weekly",
        emails: "",
      }));
      expect(res.status).toBe(400);
    });

    it("テスト送信を実行する", async () => {
      mockGenerateWeeklyReport.mockResolvedValue({
        html: "<html>テスト</html>",
        subject: "【Lオペ】週次レポート",
        data: {},
      });
      mockSendEmail.mockResolvedValue(undefined);

      const res = await PUT(createRequest("PUT", {
        enabled: true,
        frequency: "weekly",
        emails: "admin@test.com",
        testSend: true,
      }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain("テストメール");
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: "admin@test.com",
        subject: expect.stringContaining("[テスト]"),
        html: expect.stringContaining("テスト"),
      });
    });

    it("不正なfrequencyで400を返す", async () => {
      const res = await PUT(createRequest("PUT", {
        enabled: true,
        frequency: "invalid",
        emails: "a@b.com",
      }));
      expect(res.status).toBe(400);
    });
  });
});
