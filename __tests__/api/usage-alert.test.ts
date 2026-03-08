// __tests__/api/usage-alert.test.ts — 使用量アラートCronジョブ テスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モック ---
const mockAcquireLock = vi.fn();
vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
}));

const mockCheckQuota = vi.fn();
vi.mock("@/lib/usage-quota", () => ({
  checkQuota: (...args: unknown[]) => mockCheckQuota(...args),
  ALERT_THRESHOLDS: [
    { percent: 80, level: "caution" as const, label: "注意" },
    { percent: 90, level: "warning" as const, label: "警告" },
    { percent: 100, level: "limit" as const, label: "制限" },
  ],
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
vi.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

// Supabase チェーンモック
const mockTenantsResult = vi.fn<() => { data: unknown; error: unknown }>();
const mockMembersResult = vi.fn<() => { data: unknown; error: unknown }>();

function createChain(getResult: () => { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  ["select", "eq", "neq", "is", "not", "order", "limit", "single", "insert", "update", "delete"].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: (v: unknown) => void) => resolve(getResult());
  return chain;
}

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  unauthorized: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
}));

import { GET } from "@/app/api/cron/usage-alert/route";

// ヘルパー: Cronリクエスト作成
function createCronRequest(secret?: string) {
  const headers: Record<string, string> = {};
  if (secret) headers.authorization = `Bearer ${secret}`;
  return new NextRequest("http://localhost/api/cron/usage-alert", { headers });
}

describe("使用量アラートCron - GET", () => {
  const CRON_SECRET = "test-cron-secret";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;

    // デフォルト: ロック取得成功
    mockAcquireLock.mockResolvedValue({ acquired: true, release: vi.fn() });

    // デフォルト: Redis 未送信
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");

    // デフォルト: メール送信成功
    mockSendEmail.mockResolvedValue(undefined);

    // デフォルト: fromの振り分け
    mockFrom.mockImplementation((table: string) => {
      if (table === "tenants") return createChain(mockTenantsResult);
      if (table === "tenant_members") return createChain(mockMembersResult);
      return createChain(() => ({ data: null, error: null }));
    });

    mockMembersResult.mockReturnValue({ data: [], error: null });
  });

  it("認証なし → 401", async () => {
    const req = createCronRequest("wrong-secret");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("ロック取得失敗 → skipped: true", async () => {
    mockAcquireLock.mockResolvedValue({ acquired: false });
    const req = createCronRequest(CRON_SECRET);
    const res = await GET(req);
    const body = await res.json();
    expect(body.skipped).toBe(true);
  });

  it("アクティブテナントなし → processed: 0", async () => {
    mockTenantsResult.mockReturnValue({ data: [], error: null });
    const req = createCronRequest(CRON_SECRET);
    const res = await GET(req);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.alerts).toBe(0);
  });

  it("使用率80%超テナント → メール送信される", async () => {
    mockTenantsResult.mockReturnValue({
      data: [{ id: "t1", name: "テストクリニック", contact_email: "admin@test.com" }],
      error: null,
    });
    mockCheckQuota.mockResolvedValue({
      withinQuota: true,
      usage: 850,
      quota: 1000,
      percentUsed: 85,
    });

    const req = createCronRequest(CRON_SECRET);
    const res = await GET(req);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.alerts).toBe(1);
    // 80%しきい値のメールのみ送信（85% < 90%）
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "admin@test.com" }),
    );
    // Redis に送信済みフラグがセットされる
    expect(mockRedisSet).toHaveBeenCalled();
  });

  it("Redis に送信済みフラグあり → メール送信スキップ", async () => {
    mockTenantsResult.mockReturnValue({
      data: [{ id: "t1", name: "テスト", contact_email: "admin@test.com" }],
      error: null,
    });
    mockCheckQuota.mockResolvedValue({
      withinQuota: false,
      usage: 1000,
      quota: 1000,
      percentUsed: 100,
    });
    // 全しきい値で送信済み
    mockRedisGet.mockResolvedValue("1");

    const req = createCronRequest(CRON_SECRET);
    const res = await GET(req);
    const body = await res.json();

    expect(body.processed).toBe(1);
    expect(body.alerts).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
