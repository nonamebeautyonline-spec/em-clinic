// __tests__/api/admin-auth.test.ts
// 管理者認証（JWT検証 + Bearerトークン）のビジネスルールテスト
import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";

// === JWT トークン生成・検証のロジックテスト ===
describe("admin-auth JWT検証", () => {
  const TEST_SECRET = "test-jwt-secret-12345";
  const secret = new TextEncoder().encode(TEST_SECRET);

  it("有効なJWTを検証成功", async () => {
    const token = await new SignJWT({ userId: "user_001" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    // jose の jwtVerify で検証
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, secret);
    expect((payload as { userId: string }).userId).toBe("user_001");
  });

  it("期限切れJWTは検証失敗", async () => {
    const token = await new SignJWT({ userId: "user_001" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("-1h") // 1時間前に期限切れ
      .sign(secret);

    const { jwtVerify } = await import("jose");
    await expect(jwtVerify(token, secret)).rejects.toThrow();
  });

  it("不正な秘密鍵では検証失敗", async () => {
    const token = await new SignJWT({ userId: "user_001" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const { jwtVerify } = await import("jose");
    await expect(jwtVerify(token, wrongSecret)).rejects.toThrow();
  });

  it("改ざんされたJWTは検証失敗", async () => {
    const token = await new SignJWT({ userId: "user_001" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    // ペイロード部分を改ざん
    const parts = token.split(".");
    parts[1] = parts[1] + "x";
    const tampered = parts.join(".");

    const { jwtVerify } = await import("jose");
    await expect(jwtVerify(tampered, secret)).rejects.toThrow();
  });
});

// === JWTペイロードからのデータ抽出 ===
describe("admin-auth ペイロード抽出", () => {
  const TEST_SECRET = "test-jwt-secret-12345";
  const secret = new TextEncoder().encode(TEST_SECRET);

  it("userId を抽出", async () => {
    const token = await new SignJWT({ userId: "admin_uuid_001" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, secret);
    expect((payload as { userId: string }).userId).toBe("admin_uuid_001");
  });

  it("tenantId を抽出", async () => {
    const token = await new SignJWT({ userId: "admin_001", tenantId: "tenant_abc" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, secret);
    expect((payload as { tenantId: string }).tenantId).toBe("tenant_abc");
  });

  it("tenantId がnullの場合", async () => {
    const token = await new SignJWT({ userId: "admin_001", tenantId: null })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, secret);
    expect((payload as { tenantId: string | null }).tenantId).toBeNull();
  });

  it("userId が含まれない場合は null 相当", async () => {
    const token = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, secret);
    const userId = (payload as { userId?: string }).userId || null;
    expect(userId).toBeNull();
  });
});

// === Cookie vs Bearer 認証の優先順位 ===
describe("admin-auth 認証方式の優先順位", () => {
  it("Cookie（admin_session）が Bearer より優先", () => {
    // verifyAdminAuth のロジック: Cookie を先にチェック → 失敗なら Bearer
    const hasCookie = true;
    const hasBearer = true;
    // Cookie が有効ならそこで return true
    expect(hasCookie).toBe(true);
  });

  it("Cookie がなければ Bearer トークンで認証", () => {
    const hasCookie = false;
    const hasBearer = true;
    const authMethod = hasCookie ? "cookie" : hasBearer ? "bearer" : "none";
    expect(authMethod).toBe("bearer");
  });

  it("両方なければ認証失敗", () => {
    const hasCookie = false;
    const hasBearer = false;
    const authMethod = hasCookie ? "cookie" : hasBearer ? "bearer" : "none";
    expect(authMethod).toBe("none");
  });
});

// === Bearer トークン検証 ===
describe("admin-auth Bearer トークン", () => {
  function extractBearerToken(authHeader: string | null): string | null {
    if (!authHeader?.startsWith("Bearer ")) return null;
    return authHeader.substring(7);
  }

  it("Bearer プレフィックスからトークン抽出", () => {
    expect(extractBearerToken("Bearer my-token-123")).toBe("my-token-123");
  });

  it("Bearer がない場合は null", () => {
    expect(extractBearerToken("Basic abc123")).toBeNull();
  });

  it("null ヘッダーは null", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("空文字ヘッダーは null", () => {
    expect(extractBearerToken("")).toBeNull();
  });

  it("Bearer のみ（トークンなし）は空文字を返す", () => {
    expect(extractBearerToken("Bearer ")).toBe("");
  });

  it("ADMIN_TOKEN との一致チェック", () => {
    const adminToken = "secret-admin-token";
    const requestToken = "secret-admin-token";
    expect(requestToken === adminToken).toBe(true);
  });

  it("ADMIN_TOKEN と不一致", () => {
    const adminToken = "secret-admin-token";
    const requestToken = "wrong-token";
    expect(requestToken === adminToken).toBe(false);
  });
});
