// lib/__tests__/usage-alerts.test.ts
// 使用量アラートロジックのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---
const mockGetCurrentMonthUsage = vi.fn();
const mockSendUsageWarningEmail = vi.fn();
const mockCreateAlert = vi.fn();
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();

// supabaseAdmin モック
const mockSelectSingle = vi.fn();
const mockSelectMembers = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/usage", () => ({
  getCurrentMonthUsage: (...args: unknown[]) => mockGetCurrentMonthUsage(...args),
}));

vi.mock("@/lib/email", () => ({
  sendUsageWarningEmail: (...args: unknown[]) => mockSendUsageWarningEmail(...args),
}));

vi.mock("@/lib/security-alerts", () => ({
  createAlert: (...args: unknown[]) => mockCreateAlert(...args),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// 動的インポート
const { checkAndSendUsageAlerts, USAGE_THRESHOLDS } = await import(
  "@/lib/usage-alerts"
);

// ヘルパー: supabaseAdmin.from のチェーンモックをセットアップ
function setupSupabaseMock(ownerEmails: string[], tenantName: string) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "tenant_members") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: ownerEmails.map((email) => ({
                admin_users: { email },
              })),
            }),
          }),
        }),
      };
    }
    if (table === "tenants") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { name: tenantName },
            }),
          }),
        }),
      };
    }
    return { select: vi.fn().mockReturnThis() };
  });
}

describe("USAGE_THRESHOLDS", () => {
  it("閾値が正しく定義されている", () => {
    expect(USAGE_THRESHOLDS).toEqual([
      { percent: 75, severity: "warning" },
      { percent: 100, severity: "critical" },
    ]);
  });
});

describe("checkAndSendUsageAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendUsageWarningEmail.mockResolvedValue(undefined);
    mockCreateAlert.mockResolvedValue(undefined);
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
  });

  it("75%閾値到達時にアラートメールを送信する", async () => {
    mockGetCurrentMonthUsage.mockResolvedValue({
      tenantId: "t1",
      month: "2026-02",
      messageCount: 3750,
      quota: 5000,
      remaining: 1250,
      overageCount: 0,
      overageUnitPrice: 1.0,
      overageAmount: 0,
      storageMb: 0,
      storageQuotaMb: 1024,
      apiCallCount: 0,
    });

    setupSupabaseMock(["owner@example.com"], "テストクリニック");

    await checkAndSendUsageAlerts("t1");

    // 75% 閾値のみ到達（100%は未到達）
    expect(mockSendUsageWarningEmail).toHaveBeenCalledTimes(1);
    expect(mockSendUsageWarningEmail).toHaveBeenCalledWith(
      "owner@example.com",
      "テストクリニック",
      75,
      3750,
      5000,
    );

    // アラートレコード作成
    expect(mockCreateAlert).toHaveBeenCalledTimes(1);
    expect(mockCreateAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        alertType: "usage_threshold",
        severity: "medium",
      }),
    );

    // Redis に送信済みフラグ設定
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
    expect(mockRedisSet).toHaveBeenCalledWith(
      "usage_alert_sent:t1:2026-02:75",
      "1",
      { ex: 35 * 24 * 60 * 60 },
    );
  });

  it("100%到達時に両方の閾値でアラートを送信する", async () => {
    mockGetCurrentMonthUsage.mockResolvedValue({
      tenantId: "t1",
      month: "2026-02",
      messageCount: 5000,
      quota: 5000,
      remaining: 0,
      overageCount: 0,
      overageUnitPrice: 1.0,
      overageAmount: 0,
      storageMb: 0,
      storageQuotaMb: 1024,
      apiCallCount: 0,
    });

    setupSupabaseMock(["owner@example.com"], "テストクリニック");

    await checkAndSendUsageAlerts("t1");

    // 75% + 100% の2回送信
    expect(mockSendUsageWarningEmail).toHaveBeenCalledTimes(2);
    expect(mockCreateAlert).toHaveBeenCalledTimes(2);
    expect(mockRedisSet).toHaveBeenCalledTimes(2);
  });

  it("既に送信済みの閾値はスキップする（重複送信防止）", async () => {
    mockGetCurrentMonthUsage.mockResolvedValue({
      tenantId: "t1",
      month: "2026-02",
      messageCount: 3750,
      quota: 5000,
      remaining: 1250,
      overageCount: 0,
      overageUnitPrice: 1.0,
      overageAmount: 0,
      storageMb: 0,
      storageQuotaMb: 1024,
      apiCallCount: 0,
    });

    setupSupabaseMock(["owner@example.com"], "テストクリニック");

    // 75%の送信済みフラグが立っている
    mockRedisGet.mockResolvedValue("1");

    await checkAndSendUsageAlerts("t1");

    // 送信済みなのでメールは送信されない
    expect(mockSendUsageWarningEmail).not.toHaveBeenCalled();
    expect(mockCreateAlert).not.toHaveBeenCalled();
  });

  it("閾値未到達時は何も送信しない", async () => {
    mockGetCurrentMonthUsage.mockResolvedValue({
      tenantId: "t1",
      month: "2026-02",
      messageCount: 1000,
      quota: 5000,
      remaining: 4000,
      overageCount: 0,
      overageUnitPrice: 1.0,
      overageAmount: 0,
      storageMb: 0,
      storageQuotaMb: 1024,
      apiCallCount: 0,
    });

    setupSupabaseMock(["owner@example.com"], "テストクリニック");

    await checkAndSendUsageAlerts("t1");

    expect(mockSendUsageWarningEmail).not.toHaveBeenCalled();
    expect(mockCreateAlert).not.toHaveBeenCalled();
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it("複数オーナーがいる場合、全員にメール送信する", async () => {
    mockGetCurrentMonthUsage.mockResolvedValue({
      tenantId: "t1",
      month: "2026-02",
      messageCount: 4000,
      quota: 5000,
      remaining: 1000,
      overageCount: 0,
      overageUnitPrice: 1.0,
      overageAmount: 0,
      storageMb: 0,
      storageQuotaMb: 1024,
      apiCallCount: 0,
    });

    setupSupabaseMock(
      ["owner1@example.com", "owner2@example.com"],
      "テストクリニック",
    );

    await checkAndSendUsageAlerts("t1");

    // 75%閾値で2人にメール送信
    expect(mockSendUsageWarningEmail).toHaveBeenCalledTimes(2);
    expect(mockSendUsageWarningEmail).toHaveBeenCalledWith(
      "owner1@example.com",
      "テストクリニック",
      80,
      4000,
      5000,
    );
    expect(mockSendUsageWarningEmail).toHaveBeenCalledWith(
      "owner2@example.com",
      "テストクリニック",
      80,
      4000,
      5000,
    );
  });

  it("クォータが0の場合、使用率0%として処理する", async () => {
    mockGetCurrentMonthUsage.mockResolvedValue({
      tenantId: "t1",
      month: "2026-02",
      messageCount: 100,
      quota: 0,
      remaining: 0,
      overageCount: 100,
      overageUnitPrice: 1.0,
      overageAmount: 100,
      storageMb: 0,
      storageQuotaMb: 1024,
      apiCallCount: 0,
    });

    setupSupabaseMock(["owner@example.com"], "テストクリニック");

    await checkAndSendUsageAlerts("t1");

    // クォータ0では使用率0%なので閾値未到達
    expect(mockSendUsageWarningEmail).not.toHaveBeenCalled();
  });

  it("Redis障害時もサービス継続する", async () => {
    mockGetCurrentMonthUsage.mockResolvedValue({
      tenantId: "t1",
      month: "2026-02",
      messageCount: 3750,
      quota: 5000,
      remaining: 1250,
      overageCount: 0,
      overageUnitPrice: 1.0,
      overageAmount: 0,
      storageMb: 0,
      storageQuotaMb: 1024,
      apiCallCount: 0,
    });

    setupSupabaseMock(["owner@example.com"], "テストクリニック");

    // Redis読み取りエラー
    mockRedisGet.mockRejectedValue(new Error("Redis connection error"));
    // Redis書き込みエラー
    mockRedisSet.mockRejectedValue(new Error("Redis connection error"));

    // エラーが投げられずに正常に処理される
    await checkAndSendUsageAlerts("t1");

    // メールは送信される（Redis障害でもサービス継続）
    expect(mockSendUsageWarningEmail).toHaveBeenCalledTimes(1);
  });

  it("メール送信エラーでもアラートレコードは作成される", async () => {
    mockGetCurrentMonthUsage.mockResolvedValue({
      tenantId: "t1",
      month: "2026-02",
      messageCount: 3750,
      quota: 5000,
      remaining: 1250,
      overageCount: 0,
      overageUnitPrice: 1.0,
      overageAmount: 0,
      storageMb: 0,
      storageQuotaMb: 1024,
      apiCallCount: 0,
    });

    setupSupabaseMock(["owner@example.com"], "テストクリニック");

    // メール送信エラー
    mockSendUsageWarningEmail.mockRejectedValue(new Error("SMTP error"));

    await checkAndSendUsageAlerts("t1");

    // メール送信は試行された
    expect(mockSendUsageWarningEmail).toHaveBeenCalledTimes(1);
    // アラートレコードは作成される
    expect(mockCreateAlert).toHaveBeenCalledTimes(1);
  });
});
