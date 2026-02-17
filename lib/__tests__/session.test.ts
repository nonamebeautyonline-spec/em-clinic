// lib/__tests__/session.test.ts
// セッション管理（lib/session.ts）の単体テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase モック ---
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
const mockDeleteIn = vi.fn().mockResolvedValue({ error: null });
const mockDeleteLt = vi.fn();
const mockUpdate = vi.fn();
const mockSelectOrder = vi.fn();
const mockSelectEq = vi.fn();
const mockMaybeSingle = vi.fn();

// チェーン用モック
function createChain() {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockResolvedValue({ error: null });
  return chain;
}

let mockChain = createChain();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table !== "admin_sessions") throw new Error(`unexpected table: ${table}`);
      return mockChain;
    },
  }),
}));

// hashToken は crypto を使うのでモック不要
import { hashToken, createSession, validateSession, revokeSession, revokeAllSessions, cleanExpiredSessions } from "@/lib/session";

// === hashToken テスト ===
describe("hashToken — SHA-256ハッシュ生成", () => {
  it("SHA-256ハッシュ（hex）を返す", () => {
    const hash = hashToken("test-jwt");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("同じJWTは同じハッシュを返す", () => {
    expect(hashToken("jwt-abc")).toBe(hashToken("jwt-abc"));
  });

  it("異なるJWTは異なるハッシュを返す", () => {
    expect(hashToken("jwt-abc")).not.toBe(hashToken("jwt-xyz"));
  });
});

// === createSession テスト ===
describe("createSession — セッション作成", () => {
  beforeEach(() => {
    mockChain = createChain();
  });

  it("セッションをinsertする", async () => {
    // select → セッション数が上限以下
    mockChain.order.mockReturnValue({
      ...mockChain,
      then: (resolve: any) => resolve({ data: [{ id: "s1", created_at: "2026-02-17" }] }),
    });
    // Promise.allを模擬するため、selectの返り値を調整
    mockChain.select.mockImplementation(() => mockChain);
    mockChain.eq.mockImplementation(() => mockChain);
    mockChain.order.mockImplementation(() => {
      return { ...mockChain, data: [{ id: "s1", created_at: "2026-02-17" }] };
    });

    await createSession({
      adminUserId: "user-1",
      tenantId: "tenant-1",
      jwt: "test-jwt-token",
      expiresAt: new Date("2026-02-18"),
      ipAddress: "1.2.3.4",
      userAgent: "Mozilla/5.0",
    });

    // insert が呼ばれたことを確認
    expect(mockChain.insert).toHaveBeenCalled();
    const insertArg = mockChain.insert.mock.calls[0][0];
    expect(insertArg.admin_user_id).toBe("user-1");
    expect(insertArg.tenant_id).toBe("tenant-1");
    expect(insertArg.token_hash).toBe(hashToken("test-jwt-token"));
    expect(insertArg.ip_address).toBe("1.2.3.4");
    expect(insertArg.user_agent).toBe("Mozilla/5.0");
  });

  it("セッション上限（3）超過時に古いセッションを削除する", async () => {
    const sessions = [
      { id: "s1", created_at: "2026-02-17T04:00:00Z" },
      { id: "s2", created_at: "2026-02-17T03:00:00Z" },
      { id: "s3", created_at: "2026-02-17T02:00:00Z" },
      { id: "s4", created_at: "2026-02-17T01:00:00Z" },
    ];
    // select → order → 4件返す
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.order.mockResolvedValue({ data: sessions });

    await createSession({
      adminUserId: "user-1",
      tenantId: null,
      jwt: "jwt-new",
      expiresAt: new Date("2026-02-18"),
      ipAddress: null,
      userAgent: null,
    });

    // 4件 > 3（上限） → s4 を削除
    expect(mockChain.delete).toHaveBeenCalled();
    expect(mockChain.in).toHaveBeenCalledWith("id", ["s4"]);
  });

  it("セッション上限以下なら削除しない", async () => {
    const sessions = [
      { id: "s1", created_at: "2026-02-17T04:00:00Z" },
      { id: "s2", created_at: "2026-02-17T03:00:00Z" },
    ];
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.order.mockResolvedValue({ data: sessions });

    await createSession({
      adminUserId: "user-1",
      tenantId: null,
      jwt: "jwt-ok",
      expiresAt: new Date("2026-02-18"),
      ipAddress: null,
      userAgent: null,
    });

    // delete → in は呼ばれない
    expect(mockChain.in).not.toHaveBeenCalled();
  });
});

// === validateSession テスト ===
describe("validateSession — セッション検証", () => {
  beforeEach(() => {
    mockChain = createChain();
  });

  it("存在しないセッション → false", async () => {
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await validateSession("nonexistent-jwt");
    expect(result).toBe(false);
  });

  it("DBエラー → throw", async () => {
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "relation does not exist" },
    });

    await expect(validateSession("jwt")).rejects.toEqual({ message: "relation does not exist" });
  });

  it("期限切れセッション → false（削除実行）", async () => {
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.maybeSingle.mockResolvedValue({
      data: {
        id: "s1",
        last_activity: "2026-02-17T10:00:00Z",
        expires_at: "2026-02-16T00:00:00Z", // 過去
      },
      error: null,
    });

    const result = await validateSession("expired-jwt");
    expect(result).toBe(false);
    // 期限切れセッションの削除確認
    expect(mockChain.delete).toHaveBeenCalled();
  });

  it("有効期限内のセッション → true", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const recentActivity = new Date(Date.now() - 60000).toISOString(); // 1分前
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.maybeSingle.mockResolvedValue({
      data: {
        id: "s1",
        last_activity: recentActivity,
        expires_at: futureDate,
      },
      error: null,
    });

    const result = await validateSession("valid-jwt");
    expect(result).toBe(true);
  });

  it("last_activity 5分以上前 → update呼び出し", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const oldActivity = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6分前
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.maybeSingle.mockResolvedValue({
      data: {
        id: "s1",
        last_activity: oldActivity,
        expires_at: futureDate,
      },
      error: null,
    });
    mockChain.update.mockReturnValue(mockChain);

    const result = await validateSession("valid-jwt-old-activity");
    expect(result).toBe(true);
    expect(mockChain.update).toHaveBeenCalled();
  });

  it("last_activity 5分以内 → update呼び出しなし", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const recentActivity = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // 3分前
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.maybeSingle.mockResolvedValue({
      data: {
        id: "s1",
        last_activity: recentActivity,
        expires_at: futureDate,
      },
      error: null,
    });

    const result = await validateSession("valid-jwt-recent");
    expect(result).toBe(true);
    expect(mockChain.update).not.toHaveBeenCalled();
  });
});

// === revokeSession テスト ===
describe("revokeSession — セッション削除（ログアウト）", () => {
  beforeEach(() => {
    mockChain = createChain();
  });

  it("token_hashでセッションを削除する", async () => {
    mockChain.delete.mockReturnValue(mockChain);
    mockChain.eq.mockResolvedValue({ error: null });

    await revokeSession("jwt-to-revoke");

    expect(mockChain.delete).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenCalledWith("token_hash", hashToken("jwt-to-revoke"));
  });
});

// === revokeAllSessions テスト ===
describe("revokeAllSessions — 全セッション削除", () => {
  beforeEach(() => {
    mockChain = createChain();
  });

  it("admin_user_idで全セッションを削除する", async () => {
    mockChain.delete.mockReturnValue(mockChain);
    mockChain.eq.mockResolvedValue({ error: null });

    await revokeAllSessions("user-1");

    expect(mockChain.delete).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenCalledWith("admin_user_id", "user-1");
  });
});

// === cleanExpiredSessions テスト ===
describe("cleanExpiredSessions — 期限切れセッション一括削除", () => {
  beforeEach(() => {
    mockChain = createChain();
  });

  it("削除件数を返す", async () => {
    mockChain.delete.mockReturnValue(mockChain);
    mockChain.lt.mockReturnValue(mockChain);
    mockChain.select.mockResolvedValue({ data: [{ id: "s1" }, { id: "s2" }] });

    const count = await cleanExpiredSessions();
    expect(count).toBe(2);
    expect(mockChain.delete).toHaveBeenCalled();
    expect(mockChain.lt).toHaveBeenCalled();
  });

  it("削除対象なし → 0を返す", async () => {
    mockChain.delete.mockReturnValue(mockChain);
    mockChain.lt.mockReturnValue(mockChain);
    mockChain.select.mockResolvedValue({ data: null });

    const count = await cleanExpiredSessions();
    expect(count).toBe(0);
  });
});
