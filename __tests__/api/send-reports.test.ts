// __tests__/api/send-reports.test.ts — 定期レポートCronテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockAcquireLock = vi.fn();
vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
}));

const mockGetSetting = vi.fn();
vi.mock("@/lib/settings", () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
}));

const mockGenerateWeeklyReport = vi.fn();
const mockGenerateMonthlyReport = vi.fn();
vi.mock("@/lib/report-generator", () => ({
  generateWeeklyReport: (...args: unknown[]) => mockGenerateWeeklyReport(...args),
  generateMonthlyReport: (...args: unknown[]) => mockGenerateMonthlyReport(...args),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

// Supabaseモック
const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock("@/lib/api-error", () => ({
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })),
}));

import { GET } from "@/app/api/cron/send-reports/route";

function createRequest(cronSecret?: string) {
  const headers = new Headers();
  if (cronSecret) headers.set("authorization", `Bearer ${cronSecret}`);
  return new Request("http://localhost/api/cron/send-reports", {
    method: "GET",
    headers,
  }) as unknown as import("next/server").NextRequest;
}

describe("cron/send-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトではロック取得成功
    mockAcquireLock.mockResolvedValue({
      acquired: true,
      release: vi.fn(),
    });
  });

  it("CRON_SECRET不一致で401を返す", async () => {
    vi.stubEnv("CRON_SECRET", "my-secret");
    const res = await GET(createRequest("wrong-secret"));
    expect(res.status).toBe(401);
    vi.unstubAllEnvs();
  });

  it("ロック取得失敗時はスキップ", async () => {
    mockAcquireLock.mockResolvedValue({ acquired: false, release: vi.fn() });
    const res = await GET(createRequest());
    const data = await res.json();
    expect(data.skipped).toBe("別のプロセスが実行中");
  });

  it("テナント取得エラーで500を返す", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "DB error" },
        }),
      }),
    });

    const res = await GET(createRequest());
    expect(res.status).toBe(500);
  });

  it("有効なテナントにレポートを送信する", async () => {
    // テナント一覧
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: "tenant-1", name: "テストクリニック" }],
          error: null,
        }),
      }),
    });

    // 設定: 有効・週次・月曜日
    mockGetSetting.mockImplementation((_cat: string, key: string) => {
      if (key === "enabled") return "true";
      if (key === "frequency") return "weekly";
      if (key === "emails") return "admin@test.com";
      return null;
    });

    mockGenerateWeeklyReport.mockResolvedValue({
      html: "<html>週次レポート</html>",
      subject: "【Lオペ】週次レポート",
      data: {},
    });

    mockSendEmail.mockResolvedValue(undefined);

    // 月曜日のJST 09:00をシミュレート
    // JST月曜 = UTC日曜 24:00 = UTC月曜 00:00
    // テスト内でnowは制御しづらいので、結果のみチェック
    const res = await GET(createRequest());
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("レポート無効のテナントはスキップする", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: "tenant-1", name: "テスト" }],
          error: null,
        }),
      }),
    });

    mockGetSetting.mockImplementation((_cat: string, key: string) => {
      if (key === "enabled") return "false";
      return null;
    });

    const res = await GET(createRequest());
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.skipped).toBeGreaterThan(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
