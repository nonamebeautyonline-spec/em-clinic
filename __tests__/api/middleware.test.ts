// __tests__/api/middleware.test.ts
// middleware.ts（CSRF検証・Basic認証・テナントID解決）+ lib/rate-limit.ts のユニットテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Redis モック ---
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisIncr = vi.fn();
const mockRedisTtl = vi.fn();
const mockRedisDel = vi.fn();

vi.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
    incr: (...args: unknown[]) => mockRedisIncr(...args),
    ttl: (...args: unknown[]) => mockRedisTtl(...args),
    del: (...args: unknown[]) => mockRedisDel(...args),
  },
}));

// =============================================
// middleware.ts のロジックテスト
// =============================================

// middleware.ts から抽出した定数・関数（ユニットテスト用）
const CSRF_EXEMPT_PREFIXES = [
  "/api/line/webhook",
  "/api/square/webhook",
  "/api/gmo/webhook",
  "/api/cron/",
  "/api/health",
  "/api/admin/login",
  "/api/admin/logout",
  "/api/line/login",
  "/api/line/callback",
  "/api/verify/",
  "/api/csrf-token",
  "/api/doctor/",
];

const CSRF_EXEMPT_PATTERNS = [
  /^\/api\/forms\/[^/]+\/submit$/,
  /^\/api\/forms\/[^/]+\/upload$/,
  /^\/api\/bank-transfer\//,
  /^\/api\/intake$/,
  /^\/api\/checkout$/,
  /^\/api\/reorder\//,
  /^\/api\/reservations$/,
  /^\/api\/mypage/,
  /^\/api\/profile$/,
  /^\/api\/register\//,
  /^\/api\/repair$/,
];

function isCsrfExempt(pathname: string): boolean {
  if (CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (CSRF_EXEMPT_PATTERNS.some((p) => p.test(pathname))) return true;
  return false;
}

const RESERVED_SLUGS = new Set(["app", "admin", "www", "localhost", "127"]);

// CSRF検証が必要かどうか（middleware本体のロジックを再現）
function shouldRequireCsrf(
  method: string,
  pathname: string,
): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
  if (!pathname.startsWith("/api/")) return false;
  if (isCsrfExempt(pathname)) return false;
  return true;
}

// CSRFトークン一致検証（middleware本体のロジックを再現）
function verifyCsrfToken(
  headerToken: string | null | undefined,
  cookieToken: string | null | undefined,
): boolean {
  return !!headerToken && !!cookieToken && headerToken === cookieToken;
}

// Basic認証検証（middleware本体のロジックを再現）
function verifyBasicAuth(
  authHeader: string | null,
  expectedUser: string,
  expectedPass: string,
): boolean {
  if (!authHeader) return false;
  const authValue = authHeader.split(" ")[1];
  if (!authValue) return false;
  const [u, p] = Buffer.from(authValue, "base64").toString().split(":");
  return u === expectedUser && p === expectedPass;
}

// =============================================
// isCsrfExempt テスト
// =============================================
describe("isCsrfExempt — CSRF除外判定", () => {
  it("webhook パスは除外される（prefix）", () => {
    expect(isCsrfExempt("/api/line/webhook")).toBe(true);
    expect(isCsrfExempt("/api/square/webhook")).toBe(true);
    expect(isCsrfExempt("/api/gmo/webhook")).toBe(true);
  });

  it("cron パスは除外される（prefix）", () => {
    expect(isCsrfExempt("/api/cron/process-steps")).toBe(true);
    expect(isCsrfExempt("/api/cron/notifications")).toBe(true);
  });

  it("admin/login は除外される（prefix）", () => {
    expect(isCsrfExempt("/api/admin/login")).toBe(true);
  });

  it("admin/patients POST は除外されない", () => {
    expect(isCsrfExempt("/api/admin/patients")).toBe(false);
    expect(isCsrfExempt("/api/admin/patients/bulk/send")).toBe(false);
  });

  it("/api/intake は除外される（pattern）", () => {
    expect(isCsrfExempt("/api/intake")).toBe(true);
  });

  it("/api/checkout は除外される（pattern）", () => {
    expect(isCsrfExempt("/api/checkout")).toBe(true);
  });

  it("/api/mypage/orders は除外される（pattern）", () => {
    expect(isCsrfExempt("/api/mypage/orders")).toBe(true);
    expect(isCsrfExempt("/api/mypage/profile")).toBe(true);
  });

  it("/api/forms/abc/submit は除外される（pattern）", () => {
    expect(isCsrfExempt("/api/forms/abc/submit")).toBe(true);
    expect(isCsrfExempt("/api/forms/xyz123/upload")).toBe(true);
  });
});

// =============================================
// CSRF検証ロジック テスト
// =============================================
describe("CSRF検証ロジック", () => {
  it("GETリクエストはCSRF検証しない", () => {
    expect(shouldRequireCsrf("GET", "/api/admin/patients")).toBe(false);
  });

  it("exempt以外のPOSTでトークン一致→通過", () => {
    // /api/admin/patients はexemptでないのでCSRF検証対象
    expect(shouldRequireCsrf("POST", "/api/admin/patients")).toBe(true);
    // トークンが一致すれば検証通過
    expect(verifyCsrfToken("token-abc-123", "token-abc-123")).toBe(true);
  });

  it("トークン不一致→403（検証失敗）", () => {
    // exempt でないPOSTパスでCSRF検証対象
    expect(shouldRequireCsrf("POST", "/api/admin/settings")).toBe(true);
    // トークン不一致 → 検証失敗
    expect(verifyCsrfToken("token-abc", "token-xyz")).toBe(false);
    // ヘッダーなし → 検証失敗
    expect(verifyCsrfToken(null, "token-xyz")).toBe(false);
    // Cookieなし → 検証失敗
    expect(verifyCsrfToken("token-abc", null)).toBe(false);
    // 両方なし → 検証失敗
    expect(verifyCsrfToken(null, null)).toBe(false);
  });
});

// =============================================
// Basic認証テスト
// =============================================
describe("Basic認証（/doctor配下）", () => {
  const DR_USER = "dr_user";
  const DR_PASS = "dr_pass";

  it("正しい認証情報→通過", () => {
    const encoded = Buffer.from(`${DR_USER}:${DR_PASS}`).toString("base64");
    const authHeader = `Basic ${encoded}`;
    expect(verifyBasicAuth(authHeader, DR_USER, DR_PASS)).toBe(true);
  });

  it("不正な認証情報→401（認証失敗）", () => {
    // 間違ったパスワード
    const encoded = Buffer.from(`${DR_USER}:wrong_pass`).toString("base64");
    const authHeader = `Basic ${encoded}`;
    expect(verifyBasicAuth(authHeader, DR_USER, DR_PASS)).toBe(false);

    // 間違ったユーザー名
    const encoded2 = Buffer.from(`wrong_user:${DR_PASS}`).toString("base64");
    const authHeader2 = `Basic ${encoded2}`;
    expect(verifyBasicAuth(authHeader2, DR_USER, DR_PASS)).toBe(false);

    // ヘッダーなし
    expect(verifyBasicAuth(null, DR_USER, DR_PASS)).toBe(false);
  });
});

// =============================================
// RESERVED_SLUGS テスト
// =============================================
describe("RESERVED_SLUGS — 予約語スラグ", () => {
  it("app, admin, www 等の予約語はテナント解決をスキップする", () => {
    expect(RESERVED_SLUGS.has("app")).toBe(true);
    expect(RESERVED_SLUGS.has("admin")).toBe(true);
    expect(RESERVED_SLUGS.has("www")).toBe(true);
    expect(RESERVED_SLUGS.has("localhost")).toBe(true);
    expect(RESERVED_SLUGS.has("127")).toBe(true);
    // 予約語でないスラグはテナント解決対象
    expect(RESERVED_SLUGS.has("my-clinic")).toBe(false);
    expect(RESERVED_SLUGS.has("noname-beauty")).toBe(false);
  });
});

// =============================================
// lib/rate-limit.ts テスト
// =============================================
describe("checkRateLimit — レート制限チェック", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("制限内→limited:false, remaining正確", async () => {
    // 現在のカウント: 2、上限: 5 → あと2回で制限
    mockRedisGet.mockResolvedValue(2);
    mockRedisIncr.mockResolvedValue(3);

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("test:key", 5, 60);

    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(2); // 5 - 2 - 1 = 2
    expect(mockRedisGet).toHaveBeenCalledWith("rate:test:key");
    expect(mockRedisIncr).toHaveBeenCalledWith("rate:test:key");
  });

  it("制限超過→limited:true, retryAfter返却", async () => {
    // 現在のカウント: 5、上限: 5 → 制限超過
    mockRedisGet.mockResolvedValue(5);
    mockRedisTtl.mockResolvedValue(42);

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("test:key", 5, 60);

    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(42);
    expect(mockRedisTtl).toHaveBeenCalledWith("rate:test:key");
  });

  it("resetRateLimit→redis.del が呼ばれる", async () => {
    mockRedisDel.mockResolvedValue(1);

    const { resetRateLimit } = await import("@/lib/rate-limit");
    await resetRateLimit("test:key");

    expect(mockRedisDel).toHaveBeenCalledWith("rate:test:key");
  });

  it("Redis障害→制限スキップ（limited:false）", async () => {
    // Redis.get がエラーを投げる
    mockRedisGet.mockRejectedValue(new Error("Redis connection refused"));

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("test:key", 5, 60);

    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(5); // max をそのまま返す
  });
});

// =============================================
// getClientIp テスト
// =============================================
describe("getClientIp — クライアントIP取得", () => {
  it("x-forwarded-for → 最初のIPを返す", async () => {
    const { getClientIp } = await import("@/lib/rate-limit");
    const req = {
      headers: {
        get: (name: string) => {
          if (name === "x-forwarded-for") return "1.2.3.4, 5.6.7.8, 9.10.11.12";
          if (name === "x-real-ip") return "99.99.99.99";
          return null;
        },
      },
    };
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("x-forwarded-for がなければ x-real-ip を返す", async () => {
    const { getClientIp } = await import("@/lib/rate-limit");
    const req = {
      headers: {
        get: (name: string) => {
          if (name === "x-forwarded-for") return null;
          if (name === "x-real-ip") return "9.8.7.6";
          return null;
        },
      },
    };
    expect(getClientIp(req)).toBe("9.8.7.6");
  });

  it("両方なければ 'unknown' を返す", async () => {
    const { getClientIp } = await import("@/lib/rate-limit");
    const req = {
      headers: {
        get: () => null,
      },
    };
    expect(getClientIp(req)).toBe("unknown");
  });
});
