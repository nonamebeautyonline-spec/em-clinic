// lib/__tests__/admin-auth.test.ts
// 管理者認証（lib/admin-auth.ts）の単体テスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

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
  hashToken: (jwt: string) => `hash_${jwt.slice(0, 8)}`,
}));

vi.mock("@/lib/redis", () => ({
  getSessionCache: vi.fn().mockResolvedValue(null),
  setSessionCache: vi.fn().mockResolvedValue(undefined),
}));

import {
  verifyAdminAuth,
  getAdminUserId,
  getAdminTenantId,
  getAdminToken,
  getAdminPlatformRole,
  getAdminTenantRole,
  getAdminPayloadFromCookies,
} from "@/lib/admin-auth";

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
  basic?: string;
} = {}): Record<string, unknown> {
  const headers = new Map<string, string>();
  if (opts.bearer) headers.set("authorization", `Bearer ${opts.bearer}`);
  if (opts.basic) headers.set("authorization", `Basic ${opts.basic}`);

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

  it("有効なJWT Cookie + admin_sessionsテーブル未作成（throw）→ false（セッション検証失敗）", async () => {
    const jwt = await createTestJwt();
    mockValidateSession.mockRejectedValue(new Error("relation does not exist"));
    const req = mockRequest({ cookie: jwt });

    const result = await verifyAdminAuth(req);
    expect(result).toBe(false);
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

// === verifyDoctorAuth Basic認証 テスト ===
describe("verifyDoctorAuth — Basic認証（Dr用）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DR_BASIC_USER = "dr-user";
    process.env.DR_BASIC_PASS = "dr-pass";
  });

  it("Basic認証 正しい資格情報 → true", async () => {
    const { verifyDoctorAuth } = await import("@/lib/admin-auth");
    const encoded = Buffer.from("dr-user:dr-pass").toString("base64");
    const req = mockRequest({ basic: encoded });

    const result = await verifyDoctorAuth(req as unknown as NextRequest);
    expect(result).toBe(true);
  });

  it("Basic認証 不正な資格情報 → false", async () => {
    const { verifyDoctorAuth } = await import("@/lib/admin-auth");
    const encoded = Buffer.from("wrong:wrong").toString("base64");
    const req = mockRequest({ basic: encoded });

    const result = await verifyDoctorAuth(req as unknown as NextRequest);
    expect(result).toBe(false);
  });

  it("Basic認証 DR環境変数未設定 → false", async () => {
    const { verifyDoctorAuth } = await import("@/lib/admin-auth");
    delete process.env.DR_BASIC_USER;
    delete process.env.DR_BASIC_PASS;
    const encoded = Buffer.from("dr-user:dr-pass").toString("base64");
    const req = mockRequest({ basic: encoded });

    const result = await verifyDoctorAuth(req as unknown as NextRequest);
    expect(result).toBe(false);
  });
});

// === getAdminPlatformRole テスト ===
describe("getAdminPlatformRole — JWT からプラットフォームロール取得", () => {
  it("有効なJWTからplatformRoleを返す", async () => {
    const jwt = await createTestJwt({ platformRole: "super_admin" });
    const req = mockRequest({ cookie: jwt });

    const result = await getAdminPlatformRole(req);
    expect(result).toBe("super_admin");
  });

  it("platformRole未設定 → デフォルト 'tenant_admin'", async () => {
    const jwt = await createTestJwt({});
    const req = mockRequest({ cookie: jwt });

    const result = await getAdminPlatformRole(req);
    expect(result).toBe("tenant_admin");
  });

  it("Cookie無し → デフォルト 'tenant_admin'", async () => {
    const req = mockRequest();
    const result = await getAdminPlatformRole(req);
    expect(result).toBe("tenant_admin");
  });

  it("無効なJWT → デフォルト 'tenant_admin'", async () => {
    const req = mockRequest({ cookie: "invalid" });
    const result = await getAdminPlatformRole(req);
    expect(result).toBe("tenant_admin");
  });
});

// === getAdminTenantRole テスト ===
describe("getAdminTenantRole — JWT からテナントロール取得", () => {
  it("有効なJWTからtenantRoleを返す", async () => {
    const jwt = await createTestJwt({ tenantRole: "staff" });
    const req = mockRequest({ cookie: jwt });

    const result = await getAdminTenantRole(req);
    expect(result).toBe("staff");
  });

  it("tenantRole未設定 → デフォルト 'admin'", async () => {
    const jwt = await createTestJwt({});
    const req = mockRequest({ cookie: jwt });

    const result = await getAdminTenantRole(req);
    expect(result).toBe("admin");
  });

  it("Cookie無し → デフォルト 'admin'", async () => {
    const req = mockRequest();
    const result = await getAdminTenantRole(req);
    expect(result).toBe("admin");
  });
});

// === getAdminPayloadFromCookies テスト ===
describe("getAdminPayloadFromCookies — Server Component用JWT解析", () => {
  it("有効なJWT → ペイロードを返す", async () => {
    const jwt = await createTestJwt({ userId: "u1", tenantId: "t1" });
    const result = await getAdminPayloadFromCookies(jwt);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe("u1");
    expect(result?.tenantId).toBe("t1");
  });

  it("undefined → null", async () => {
    const result = await getAdminPayloadFromCookies(undefined);
    expect(result).toBeNull();
  });

  it("無効なJWT → null", async () => {
    const result = await getAdminPayloadFromCookies("invalid-jwt-token");
    expect(result).toBeNull();
  });

  it("空文字 → null", async () => {
    const result = await getAdminPayloadFromCookies("");
    expect(result).toBeNull();
  });
});
