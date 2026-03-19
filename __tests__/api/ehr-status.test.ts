// __tests__/api/ehr-status.test.ts — EHR接続ステータスモニタリング テスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ──────────────────── モック ────────────────────

// チェーン可能なSupabaseクエリビルダーのモック
function createChainMock(resolveData: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "not", "is", "gte", "lte", "order", "limit",
    "maybeSingle", "single",
  ];
  for (const m of methods) {
    chain[m] = vi.fn();
  }
  for (const m of methods) {
    chain[m].mockImplementation(() => {
      if (m === "maybeSingle" || m === "single") {
        return Promise.resolve({ data: resolveData, error: null });
      }
      return chain;
    });
  }
  (chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
    resolve({ data: resolveData, error: null });
  return chain;
}

const mockFrom = vi.fn(() => createChainMock(null));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockGetSetting = vi.fn();
vi.mock("@/lib/settings", () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
}));

const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant-123"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant-123"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn((tid: string) => ({ tenant_id: tid })),
}));

vi.mock("@/lib/session", () => ({
  validateSession: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/ehr/sync", () => ({
  createAdapter: vi.fn().mockResolvedValue(null),
}));

// ──────────────────── テスト ────────────────────

import { GET } from "@/app/api/admin/ehr/status/route";

function makeRequest(url = "http://localhost/api/admin/ehr/status") {
  return new NextRequest(url);
}

describe("GET /api/admin/ehr/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSetting.mockResolvedValue(null);
    mockFrom.mockReturnValue(createChainMock(null));
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証失敗時は401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("プロバイダー未設定時は disconnected を返す", async () => {
    mockGetSetting.mockResolvedValue(null);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.connectionStatus).toBe("disconnected");
    expect(body.lastSyncAt).toBeNull();
    expect(body.lastSyncResult).toBeNull();
    expect(body.syncStats).toEqual({ success: 0, failed: 0, total: 0 });
    expect(body.system.provider).toBeNull();
    expect(body.system.providerLabel).toBeNull();
  });

  it("プロバイダー設定あり & 同期ログなし → disconnected", async () => {
    mockGetSetting.mockImplementation(
      (_cat: string, key: string) => {
        if (key === "provider") return Promise.resolve("orca");
        return Promise.resolve(null);
      }
    );

    // ehr_sync_logs: 空配列を返す
    const emptyChain = createChainMock(null);
    (emptyChain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
      resolve({ data: [], error: null });

    mockFrom.mockReturnValue(emptyChain);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.connectionStatus).toBe("disconnected");
    expect(body.system.provider).toBe("orca");
    expect(body.system.providerLabel).toContain("ORCA");
  });

  it("最終同期が成功 → connected", async () => {
    mockGetSetting.mockImplementation(
      (_cat: string, key: string) => {
        if (key === "provider") return Promise.resolve("fhir");
        if (key === "version") return Promise.resolve("R4");
        return Promise.resolve(null);
      }
    );

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // 最終同期ログ（1件）
        const chain = createChainMock(null);
        (chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          resolve({
            data: [{ created_at: "2026-03-08T10:00:00Z", status: "success" }],
            error: null,
          });
        return chain;
      }
      // 直近24時間の統計
      const chain = createChainMock(null);
      (chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
        resolve({
          data: [
            { status: "success" },
            { status: "success" },
            { status: "error" },
          ],
          error: null,
        });
      return chain;
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.connectionStatus).toBe("connected");
    expect(body.lastSyncAt).toBe("2026-03-08T10:00:00Z");
    expect(body.lastSyncResult).toBe("success");
    expect(body.syncStats.success).toBe(2);
    expect(body.syncStats.failed).toBe(1);
    expect(body.syncStats.total).toBe(3);
    expect(body.system.provider).toBe("fhir");
    expect(body.system.providerLabel).toBe("FHIR R4");
    expect(body.system.version).toBe("R4");
  });

  it("最終同期がエラー → error", async () => {
    mockGetSetting.mockImplementation(
      (_cat: string, key: string) => {
        if (key === "provider") return Promise.resolve("csv");
        return Promise.resolve(null);
      }
    );

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain = createChainMock(null);
        (chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
          resolve({
            data: [{ created_at: "2026-03-07T18:30:00Z", status: "error" }],
            error: null,
          });
        return chain;
      }
      const chain = createChainMock(null);
      (chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
        resolve({ data: [{ status: "error" }], error: null });
      return chain;
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.connectionStatus).toBe("error");
    expect(body.lastSyncResult).toBe("failed");
    expect(body.syncStats.failed).toBe(1);
    expect(body.system.providerLabel).toBe("CSV連携");
  });

  it("テナントIDが正しく伝播する", async () => {
    mockGetSetting.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/admin/ehr/status", {
      headers: { "x-tenant-id": "test-tenant-123" },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    // getSetting がテナントID付きで呼ばれていることを確認
    expect(mockGetSetting).toHaveBeenCalledWith("ehr", "provider", "test-tenant-123");
  });

  it("内部エラー時は500を返す", async () => {
    mockGetSetting.mockRejectedValue(new Error("DB接続エラー"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe("SERVER_ERROR");
    expect(body.message).toBe("DB接続エラー");
  });
});
