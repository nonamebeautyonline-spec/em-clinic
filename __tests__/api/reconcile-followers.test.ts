// __tests__/api/reconcile-followers.test.ts — LINEフォロワー突合API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モック ---
const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

const mockGetSettingOrEnv = vi.fn();
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: (...args: unknown[]) => mockGetSettingOrEnv(...args),
}));

vi.mock("@/lib/api-error", () => ({
  unauthorized: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  serverError: (msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 }),
}));

// Supabase モック
function createChain(getResult: () => { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  ["select", "eq", "neq", "is", "not", "order", "limit", "single",
   "insert", "update", "delete", "upsert", "filter", "rpc"].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: (v: unknown) => void) => resolve(getResult());
  return chain;
}

const mockPatientsResult = vi.fn<() => { data: unknown; error: unknown }>();
const mockInsertResult = vi.fn<() => { data: unknown; error: unknown }>();
const mockRpcResult = vi.fn<() => { data: unknown; error: unknown }>();

const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// fetch モック（LINE API）
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { GET } from "@/app/api/admin/line/reconcile-followers/route";

function createRequest(url: string) {
  return new NextRequest(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

describe("LINEフォロワー突合API - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockGetSettingOrEnv.mockResolvedValue("test-line-token");

    // デフォルト: patientsテーブルは空
    mockPatientsResult.mockReturnValue({ data: [], error: null });
    mockInsertResult.mockReturnValue({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "patients") return createChain(mockPatientsResult);
      // intake, friend_summaries, message_log の insert は成功
      return createChain(mockInsertResult);
    });
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createRequest("http://localhost/api/admin/line/reconcile-followers");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("LINEトークン未設定 → 500", async () => {
    mockGetSettingOrEnv.mockResolvedValue("");
    const req = createRequest("http://localhost/api/admin/line/reconcile-followers");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("dryRun=true → DB変更なしでプレビュー返却", async () => {
    // LINE API: フォロワー2人
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ userIds: ["U001", "U002"], next: undefined }),
      text: async () => "",
    });

    // DB: 既存患者1人
    mockPatientsResult.mockReturnValue({
      data: [{ line_id: "U001", patient_id: "P001" }],
      error: null,
    });

    const req = createRequest("http://localhost/api/admin/line/reconcile-followers?dryRun=true");
    const res = await GET(req);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.lineFollowers).toBe(2);
    expect(body.missing).toBe(1);
    expect(body.missingIds).toContain("U002");
    // dryRunなのでRPC呼ばれない
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("未登録フォロワーをRPCで作成する", async () => {
    // LINE API: フォロワー1人
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ userIds: ["U_NEW"], next: undefined }),
        text: async () => "",
      })
      // getLineProfile 呼び出し
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ displayName: "テスト太郎", pictureUrl: "https://example.com/pic.jpg" }),
      });

    // DB: 既存患者なし
    mockPatientsResult.mockReturnValue({ data: [], error: null });

    // RPC成功
    mockRpc.mockResolvedValue({
      data: { ok: true, patient_id: "P_NEW", created: true },
      error: null,
    });

    const req = createRequest("http://localhost/api/admin/line/reconcile-followers");
    const res = await GET(req);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.created).toBe(1);
    expect(body.results[0].status).toBe("created_rpc");
    expect(mockRpc).toHaveBeenCalledWith("find_or_create_patient", expect.objectContaining({
      p_line_uid: "U_NEW",
    }));
  });
});
