// lib/__tests__/admin-auth.test.ts
// 管理者認証（lib/admin-auth.ts）の単体テスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// vi.hoisted で環境変数を最優先セットアップ（admin-auth.ts のトップレベルチェックより前）
const TEST_SECRET = vi.hoisted(() => {
  const secret = "test-jwt-secret-key-for-unit-tests";
  process.env.JWT_SECRET = secret;
  process.env.ADMIN_TOKEN = "admin-bearer-token-123";
  return secret;
});

// --- validateSession モック ---
const mockValidateSession = vi.fn();
vi.mock("@/lib/session", () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}));

import { verifyAdminAuth, getAdminUserId, getAdminTenantId, getAdminToken } from "@/lib/admin-auth";

// === ヘルパー: 有効なJWTを生成 ===
async function createTestJwt(payload: Record<string, unknown> = {}): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  return new SignJWT({ userId: "admin-uuid-1", tenantId: "tenant-1", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret);
}

// === NextRequest モック ===
function mockRequest(opts: {
  cookie?: string;
  bearer?: string;
} = {}): any {
  const headers = new Map<string, string>();
  if (opts.bearer) headers.set("authorization", `Bearer ${opts.bearer}`);

  const cookies = new Map<string, { value: string }>();
  if (opts.cookie) cookies.set("admin_session", { value: opts.cookie });

  return {
    headers: {
      get: (name: string) => headers.get(name) || null,
    },
    cookies: {
      get: (name: string) => cookies.get(name) || undefined,
    },
  };
}

// === verifyAdminAuth テスト ===
describe("verifyAdminAuth — 管理者認証", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("有効なJWT Cookie + セッション有効 → true", async () => {
    const jwt = await createTestJwt();
    mockValidateSession.mockResolvedValue(true);
    const req = mockRequest({ cookie: jwt });

    const result = await verifyAdminAuth(req);
    expect(result).toBe(true);
    expect(mockValidateSession).toHaveBeenCalledWith(jwt);
  });

  it("有効なJWT Cookie + セッション無効 → false", async () => {
    const jwt = await createTestJwt();
    mockValidateSession.mockResolvedValue(false);
    const req = mockRequest({ cookie: jwt });

    const result = await verifyAdminAuth(req);
    expect(result).toBe(false);
  });

  it("有効なJWT Cookie + admin_sessionsテーブル未作成（throw）→ true（JWTのみで認証）", async () => {
    const jwt = await createTestJwt();
    mockValidateSession.mockRejectedValue(new Error("relation does not exist"));
    const req = mockRequest({ cookie: jwt });

    const result = await verifyAdminAuth(req);
    expect(result).toBe(true);
  });

  it("無効なJWT Cookie → Bearer認証にフォールバック", async () => {
    const req = mockRequest({ cookie: "invalid-jwt", bearer: "admin-bearer-token-123" });

    const result = await verifyAdminAuth(req);
    expect(result).toBe(true);
  });

  it("Bearer Token が ADMIN_TOKEN と一致 → true", async () => {
    const req = mockRequest({ bearer: "admin-bearer-token-123" });

    const result = await verifyAdminAuth(req);
    expect(result).toBe(true);
  });

  it("Bearer Token が不一致 → false", async () => {
    const req = mockRequest({ bearer: "wrong-token" });

    const result = await verifyAdminAuth(req);
    expect(result).toBe(false);
  });

  it("Cookie も Bearer も無し → false", async () => {
    const req = mockRequest();

    const result = await verifyAdminAuth(req);
    expect(result).toBe(false);
  });
});

// === getAdminUserId テスト ===
describe("getAdminUserId — JWT からユーザーID取得", () => {
  it("有効なJWTからuserIdを返す", async () => {
    const jwt = await createTestJwt({ userId: "user-uuid-abc" });
    const req = mockRequest({ cookie: jwt });

    const result = await getAdminUserId(req);
    expect(result).toBe("user-uuid-abc");
  });

  it("JWT にuserIdがない → null", async () => {
    const secret = new TextEncoder().encode(TEST_SECRET);
    const jwt = await new SignJWT({ tenantId: "t1" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);
    const req = mockRequest({ cookie: jwt });

    const result = await getAdminUserId(req);
    expect(result).toBeNull();
  });

  it("Cookie 無し → null", async () => {
    const req = mockRequest();

    const result = await getAdminUserId(req);
    expect(result).toBeNull();
  });

  it("無効なJWT → null", async () => {
    const req = mockRequest({ cookie: "invalid" });

    const result = await getAdminUserId(req);
    expect(result).toBeNull();
  });
});

// === getAdminTenantId テスト ===
describe("getAdminTenantId — JWT からテナントID取得", () => {
  it("有効なJWTからtenantIdを返す", async () => {
    const jwt = await createTestJwt({ tenantId: "tenant-xyz" });
    const req = mockRequest({ cookie: jwt });

    const result = await getAdminTenantId(req);
    expect(result).toBe("tenant-xyz");
  });

  it("tenantId無し → null", async () => {
    const secret = new TextEncoder().encode(TEST_SECRET);
    const jwt = await new SignJWT({ userId: "u1" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);
    const req = mockRequest({ cookie: jwt });

    const result = await getAdminTenantId(req);
    expect(result).toBeNull();
  });

  it("Cookie 無し → null", async () => {
    const req = mockRequest();
    const result = await getAdminTenantId(req);
    expect(result).toBeNull();
  });
});

// === getAdminToken テスト ===
describe("getAdminToken — トークン取得", () => {
  it("有効なJWT Cookie → ADMIN_TOKEN を返す", async () => {
    const jwt = await createTestJwt();
    const req = mockRequest({ cookie: jwt });

    const result = await getAdminToken(req);
    expect(result).toBe("admin-bearer-token-123");
  });

  it("Bearer Token 一致 → トークンを返す", async () => {
    const req = mockRequest({ bearer: "admin-bearer-token-123" });

    const result = await getAdminToken(req);
    expect(result).toBe("admin-bearer-token-123");
  });

  it("Bearer Token 不一致 → null", async () => {
    const req = mockRequest({ bearer: "wrong-token" });

    const result = await getAdminToken(req);
    expect(result).toBeNull();
  });

  it("認証情報なし → null", async () => {
    const req = mockRequest();

    const result = await getAdminToken(req);
    expect(result).toBeNull();
  });
});
