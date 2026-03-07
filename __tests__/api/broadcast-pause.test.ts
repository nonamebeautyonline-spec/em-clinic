// __tests__/api/broadcast-pause.test.ts
// ブロードキャスト配信の一時停止/再開APIのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// === モック設定 ===
const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/admin-auth", () => ({ verifyAdminAuth: mockVerifyAdminAuth }));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn(() => ({})),
}));

// Supabase モック
let mockMaybeSingleData: unknown = null;
let mockMaybeSingleError: unknown = null;
let mockUpdateError: unknown = null;

function createMockChain(): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => ({ data: mockMaybeSingleData, error: mockMaybeSingleError }));
  // update().eq() の終端として then を追加
  chain.then = vi.fn((resolve: (value: unknown) => unknown) => resolve({ data: null, error: mockUpdateError }));
  return chain;
}

const mockChain = createMockChain();
const mockFrom = vi.fn(() => mockChain);

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mockFrom },
}));

// --- テスト用ヘルパー ---
function createRequest(method = "PATCH") {
  return new Request("http://localhost/api/admin/line/broadcast/123/pause", {
    method,
    headers: { "Content-Type": "application/json" },
  });
}

const paramsPromise = (id: string) => Promise.resolve({ id });

// --- テスト ---
describe("ブロードキャスト一時停止 API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingleData = null;
    mockMaybeSingleError = null;
    mockUpdateError = null;
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("scheduled 配信を一時停止できる", async () => {
    mockMaybeSingleData = { id: 123, status: "scheduled" };
    mockUpdateError = null;

    const { PATCH } = await import("@/app/api/admin/line/broadcast/[id]/pause/route");
    const res = await PATCH(createRequest() as never, { params: paramsPromise("123") });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("paused");

    // update が paused ステータスで呼ばれたことを確認
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paused" })
    );
  });

  it("認証なしの場合は401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { PATCH } = await import("@/app/api/admin/line/broadcast/[id]/pause/route");
    const res = await PATCH(createRequest() as never, { params: paramsPromise("123") });

    expect(res.status).toBe(401);
  });

  it("存在しない配信IDの場合は404を返す", async () => {
    mockMaybeSingleData = null;

    const { PATCH } = await import("@/app/api/admin/line/broadcast/[id]/pause/route");
    const res = await PATCH(createRequest() as never, { params: paramsPromise("999") });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.message).toContain("見つかりません");
  });

  it("scheduled 以外のステータスは400を返す", async () => {
    mockMaybeSingleData = { id: 123, status: "sent" };

    const { PATCH } = await import("@/app/api/admin/line/broadcast/[id]/pause/route");
    const res = await PATCH(createRequest() as never, { params: paramsPromise("123") });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toContain("予約済みの配信のみ");
  });

  it("paused 状態の配信は一時停止できない", async () => {
    mockMaybeSingleData = { id: 123, status: "paused" };

    const { PATCH } = await import("@/app/api/admin/line/broadcast/[id]/pause/route");
    const res = await PATCH(createRequest() as never, { params: paramsPromise("123") });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toContain("予約済みの配信のみ");
  });

  it("DB取得エラー時は500を返す", async () => {
    mockMaybeSingleError = { message: "DB接続エラー" };
    mockMaybeSingleData = null;

    const { PATCH } = await import("@/app/api/admin/line/broadcast/[id]/pause/route");
    const res = await PATCH(createRequest() as never, { params: paramsPromise("123") });

    expect(res.status).toBe(500);
  });
});

describe("ブロードキャスト再開 API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingleData = null;
    mockMaybeSingleError = null;
    mockUpdateError = null;
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("paused 配信を再開できる", async () => {
    mockMaybeSingleData = { id: 123, status: "paused" };
    mockUpdateError = null;

    const { PATCH } = await import("@/app/api/admin/line/broadcast/[id]/resume/route");
    const res = await PATCH(createRequest() as never, { params: paramsPromise("123") });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("scheduled");

    // update が scheduled ステータスで呼ばれたことを確認
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "scheduled", paused_at: null })
    );
  });

  it("認証なしの場合は401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { PATCH } = await import("@/app/api/admin/line/broadcast/[id]/resume/route");
    const res = await PATCH(createRequest() as never, { params: paramsPromise("123") });

    expect(res.status).toBe(401);
  });

  it("存在しない配信IDの場合は404を返す", async () => {
    mockMaybeSingleData = null;

    const { PATCH } = await import("@/app/api/admin/line/broadcast/[id]/resume/route");
    const res = await PATCH(createRequest() as never, { params: paramsPromise("999") });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.message).toContain("見つかりません");
  });

  it("paused 以外のステータスは400を返す", async () => {
    mockMaybeSingleData = { id: 123, status: "scheduled" };

    const { PATCH } = await import("@/app/api/admin/line/broadcast/[id]/resume/route");
    const res = await PATCH(createRequest() as never, { params: paramsPromise("123") });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toContain("一時停止中の配信のみ");
  });

  it("sent 状態の配信は再開できない", async () => {
    mockMaybeSingleData = { id: 123, status: "sent" };

    const { PATCH } = await import("@/app/api/admin/line/broadcast/[id]/resume/route");
    const res = await PATCH(createRequest() as never, { params: paramsPromise("123") });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toContain("一時停止中の配信のみ");
  });

  it("DB更新エラー時は500を返す", async () => {
    mockMaybeSingleData = { id: 123, status: "paused" };
    mockUpdateError = { message: "DB更新エラー" };

    const { PATCH } = await import("@/app/api/admin/line/broadcast/[id]/resume/route");
    const res = await PATCH(createRequest() as never, { params: paramsPromise("123") });

    expect(res.status).toBe(500);
  });
});
