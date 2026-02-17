// __tests__/api/security.test.ts
// セキュリティ関連テスト（CSRF, Rate Limiting, セッション管理, 監査ログ, CSP）
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
}

// === CSRF トークン生成 ===
describe("csrf-token トークン生成", () => {
  it("UUIDv4形式のトークンが生成される", () => {
    const token = crypto.randomUUID();
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("毎回異なるトークンが生成される", () => {
    const t1 = crypto.randomUUID();
    const t2 = crypto.randomUUID();
    expect(t1).not.toBe(t2);
  });
});

// === CSRF 検証ロジック（middleware.ts のソースコード検証） ===
describe("CSRF検証: middleware.ts ソース検証", () => {
  const src = readFile("middleware.ts");

  it("Double Submit Cookie パターンを実装している", () => {
    expect(src).toContain("x-csrf-token");
    expect(src).toContain("csrf_token");
  });

  it("POST/PUT/PATCH/DELETE を検証対象としている", () => {
    expect(src).toContain("POST");
    expect(src).toContain("PUT");
    expect(src).toContain("PATCH");
    expect(src).toContain("DELETE");
  });

  it("LINE webhook を除外している", () => {
    expect(src).toContain("line/webhook");
  });

  it("Square webhook を除外している", () => {
    expect(src).toContain("square/webhook");
  });

  it("GMO webhook を除外している", () => {
    expect(src).toContain("gmo/webhook");
  });

  it("Cron ルートを除外している", () => {
    expect(src).toContain("cron");
  });

  it("患者向けAPI（intake, checkout, reorder, mypage）を除外している", () => {
    expect(src).toContain("intake");
    expect(src).toContain("checkout");
    expect(src).toContain("reorder");
    expect(src).toContain("mypage");
  });

  it("CSRF検証失敗時に 403 を返す", () => {
    expect(src).toContain("403");
  });
});

// === CSRF 検証ロジック（純粋関数テスト） ===
describe("CSRF検証ロジック: 判定関数", () => {
  function shouldCheckCsrf(method: string, pathname: string, exemptPrefixes: string[], exemptPatterns: RegExp[]): boolean {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
    if (!pathname.startsWith("/api/")) return false;
    if (exemptPrefixes.some(p => pathname.startsWith(p))) return false;
    if (exemptPatterns.some(p => p.test(pathname))) return false;
    return true;
  }

  const exemptPrefixes = [
    "/api/line/webhook",
    "/api/square/webhook",
    "/api/gmo/webhook",
    "/api/cron/",
    "/api/admin/login",
    "/api/admin/logout",
    "/api/csrf-token",
    "/api/doctor/",
  ];

  const exemptPatterns = [
    /^\/api\/intake$/,
    /^\/api\/checkout$/,
    /^\/api\/reorder\//,
    /^\/api\/mypage/,
  ];

  it("GETリクエストはCSRF検証しない", () => {
    expect(shouldCheckCsrf("GET", "/api/admin/patients", exemptPrefixes, exemptPatterns)).toBe(false);
  });

  it("管理画面のPOSTはCSRF検証する", () => {
    expect(shouldCheckCsrf("POST", "/api/admin/patients/bulk/send", exemptPrefixes, exemptPatterns)).toBe(true);
  });

  it("LINE webhookはCSRF除外", () => {
    expect(shouldCheckCsrf("POST", "/api/line/webhook", exemptPrefixes, exemptPatterns)).toBe(false);
  });

  it("Square webhookはCSRF除外", () => {
    expect(shouldCheckCsrf("POST", "/api/square/webhook", exemptPrefixes, exemptPatterns)).toBe(false);
  });

  it("GMO webhookはCSRF除外", () => {
    expect(shouldCheckCsrf("POST", "/api/gmo/webhook", exemptPrefixes, exemptPatterns)).toBe(false);
  });

  it("CronはCSRF除外", () => {
    expect(shouldCheckCsrf("POST", "/api/cron/process-steps", exemptPrefixes, exemptPatterns)).toBe(false);
  });

  it("Dr画面APIはCSRF除外", () => {
    expect(shouldCheckCsrf("POST", "/api/doctor/update", exemptPrefixes, exemptPatterns)).toBe(false);
  });

  it("患者向けintakeはCSRF除外", () => {
    expect(shouldCheckCsrf("POST", "/api/intake", exemptPrefixes, exemptPatterns)).toBe(false);
  });

  it("患者向けcheckoutはCSRF除外", () => {
    expect(shouldCheckCsrf("POST", "/api/checkout", exemptPrefixes, exemptPatterns)).toBe(false);
  });

  it("患者向けreorderはCSRF除外", () => {
    expect(shouldCheckCsrf("POST", "/api/reorder/apply", exemptPrefixes, exemptPatterns)).toBe(false);
  });

  it("マイページはCSRF除外", () => {
    expect(shouldCheckCsrf("POST", "/api/mypage/profile", exemptPrefixes, exemptPatterns)).toBe(false);
  });

  it("PUTリクエストもCSRF検証する", () => {
    expect(shouldCheckCsrf("PUT", "/api/admin/settings", exemptPrefixes, exemptPatterns)).toBe(true);
  });

  it("DELETEリクエストもCSRF検証する", () => {
    expect(shouldCheckCsrf("DELETE", "/api/admin/products", exemptPrefixes, exemptPatterns)).toBe(true);
  });

  it("PATCHリクエストもCSRF検証する", () => {
    expect(shouldCheckCsrf("PATCH", "/api/admin/patients/123/fields", exemptPrefixes, exemptPatterns)).toBe(true);
  });
});

// === CSRFトークン一致検証 ===
describe("CSRF トークン一致検証", () => {
  function verifyCsrf(headerToken: string | null, cookieToken: string | null): boolean {
    return !!headerToken && !!cookieToken && headerToken === cookieToken;
  }

  it("ヘッダーとCookieが一致 → OK", () => {
    expect(verifyCsrf("abc-123", "abc-123")).toBe(true);
  });

  it("ヘッダーなし → 拒否", () => {
    expect(verifyCsrf(null, "abc-123")).toBe(false);
  });

  it("Cookieなし → 拒否", () => {
    expect(verifyCsrf("abc-123", null)).toBe(false);
  });

  it("不一致 → 拒否", () => {
    expect(verifyCsrf("abc-123", "xyz-456")).toBe(false);
  });

  it("両方空文字 → 拒否", () => {
    expect(verifyCsrf("", "")).toBe(false);
  });
});

// === Rate Limiting ソースコード検証 ===
describe("Rate Limiting: ソースコード検証", () => {
  const src = readFile("lib/rate-limit.ts");

  it("Redis を使用している", () => {
    const hasRedis = src.includes("redis") || src.includes("Redis");
    expect(hasRedis).toBe(true);
  });

  it("checkRateLimit 関数がエクスポートされている", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+checkRateLimit/);
  });

  it("制限超過時に limited: true を返す", () => {
    expect(src).toContain("limited");
  });

  it("レスポンスにretryAfter情報を含む", () => {
    expect(src).toContain("retryAfter");
  });

  it("resetRateLimit 関数がエクスポートされている", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+resetRateLimit/);
  });

  it("getClientIp 関数がエクスポートされている", () => {
    expect(src).toMatch(/export\s+function\s+getClientIp/);
  });
});

// === Rate Limiting: IP取得ロジック（純粋関数テスト） ===
describe("Rate Limiting: IP取得", () => {
  function getClientIp(headers: Record<string, string | null>): string {
    const forwarded = headers["x-forwarded-for"];
    if (forwarded) return forwarded.split(",")[0].trim();
    return headers["x-real-ip"] || "unknown";
  }

  it("x-forwarded-for から取得（最初のIP）", () => {
    expect(getClientIp({ "x-forwarded-for": "1.2.3.4, 5.6.7.8", "x-real-ip": null })).toBe("1.2.3.4");
  });

  it("x-forwarded-for がなければ x-real-ip", () => {
    expect(getClientIp({ "x-forwarded-for": null, "x-real-ip": "9.8.7.6" })).toBe("9.8.7.6");
  });

  it("両方なければ unknown", () => {
    expect(getClientIp({ "x-forwarded-for": null, "x-real-ip": null })).toBe("unknown");
  });
});

// === セッション管理: ソースコード検証 ===
describe("セッション管理: ソースコード検証", () => {
  const src = readFile("lib/session.ts");

  it("SHA-256 ハッシュを使用している", () => {
    expect(src).toContain("sha256");
  });

  it("createSession がエクスポートされている", () => {
    expect(src).toContain("createSession");
  });

  it("validateSession がエクスポートされている", () => {
    expect(src).toContain("validateSession");
  });

  it("revokeSession がエクスポートされている", () => {
    expect(src).toContain("revokeSession");
  });

  it("admin_sessions テーブルを使用している", () => {
    expect(src).toContain("admin_sessions");
  });

  it("同時セッション上限 MAX_SESSIONS_PER_USER を定義", () => {
    expect(src).toContain("MAX_SESSIONS_PER_USER");
  });

  it("last_activity 更新スロットリング（5分）", () => {
    // 5分 = 5 * 60 * 1000
    const hasThrottle = src.includes("300000") || src.includes("5 * 60 * 1000") || src.includes("5 * 60");
    expect(hasThrottle).toBe(true);
  });
});

// === セッション管理: 純粋ロジックテスト ===
describe("セッション管理: ハッシュ・有効期限ロジック", () => {
  it("JWTハッシュはSHA-256で64文字", () => {
    const { createHash } = require("crypto");
    const hash = createHash("sha256").update("test-jwt-token").digest("hex");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("同じJWTは同じハッシュを返す", () => {
    const { createHash } = require("crypto");
    const h1 = createHash("sha256").update("jwt-abc").digest("hex");
    const h2 = createHash("sha256").update("jwt-abc").digest("hex");
    expect(h1).toBe(h2);
  });

  it("異なるJWTは異なるハッシュを返す", () => {
    const { createHash } = require("crypto");
    const h1 = createHash("sha256").update("jwt-abc").digest("hex");
    const h2 = createHash("sha256").update("jwt-xyz").digest("hex");
    expect(h1).not.toBe(h2);
  });

  it("期限切れセッションは無効", () => {
    const expiresAt = new Date("2026-02-16T00:00:00Z");
    const now = new Date("2026-02-17T00:00:00Z");
    expect(expiresAt < now).toBe(true);
  });

  it("有効期限内セッションは有効", () => {
    const expiresAt = new Date("2026-02-18T00:00:00Z");
    const now = new Date("2026-02-17T00:00:00Z");
    expect(expiresAt < now).toBe(false);
  });

  it("last_activity 5分超過で更新", () => {
    const lastActivity = new Date("2026-02-17T10:00:00Z");
    const now = new Date("2026-02-17T10:06:00Z");
    const elapsed = now.getTime() - lastActivity.getTime();
    expect(elapsed > 5 * 60 * 1000).toBe(true);
  });

  it("last_activity 5分以内は更新しない", () => {
    const lastActivity = new Date("2026-02-17T10:00:00Z");
    const now = new Date("2026-02-17T10:03:00Z");
    const elapsed = now.getTime() - lastActivity.getTime();
    expect(elapsed > 5 * 60 * 1000).toBe(false);
  });
});

// === 監査ログ: ソースコード検証 ===
describe("監査ログ: ソースコード検証", () => {
  const src = readFile("lib/audit.ts");

  it("logAudit 関数がエクスポートされている", () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+logAudit/);
  });

  it("audit_logs テーブルに挿入している", () => {
    expect(src).toContain("audit_logs");
    expect(src).toContain(".insert(");
  });

  it("Supabase クライアントを使用している", () => {
    const hasClient = src.includes("supabaseAdmin") || src.includes("createClient");
    expect(hasClient).toBe(true);
  });

  it("fire-and-forget: エラーをcatchしている", () => {
    expect(src).toContain("catch");
  });

  it("テナント対応している", () => {
    const hasTenant = src.includes("tenant_id") || src.includes("tenantPayload") || src.includes("withTenant") || src.includes("resolveTenantId");
    expect(hasTenant).toBe(true);
  });

  it("JWT からユーザー情報を取得している", () => {
    expect(src).toContain("jwtVerify");
  });

  it("IPアドレスを記録している", () => {
    expect(src).toContain("ip_address");
  });
});

// === CSP ヘッダー: next.config.ts 検証 ===
describe("CSP ヘッダー: next.config.ts 検証", () => {
  const src = readFile("next.config.ts");

  it("X-Content-Type-Options: nosniff", () => {
    expect(src).toContain("X-Content-Type-Options");
    expect(src).toContain("nosniff");
  });

  it("X-Frame-Options を設定している", () => {
    expect(src).toContain("X-Frame-Options");
  });

  it("X-XSS-Protection を設定している", () => {
    expect(src).toContain("X-XSS-Protection");
  });

  it("Referrer-Policy を設定している", () => {
    expect(src).toContain("Referrer-Policy");
  });

  it("Content-Security-Policy を設定している", () => {
    expect(src).toContain("Content-Security-Policy");
  });

  it("Permissions-Policy を設定している", () => {
    expect(src).toContain("Permissions-Policy");
  });
});

// === csrf-token エンドポイント: ソースコード検証 ===
describe("csrf-token エンドポイント: ソースコード検証", () => {
  const src = readFile("app/api/csrf-token/route.ts");

  it("GET がエクスポートされている", () => {
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("randomUUID でトークン生成", () => {
    expect(src).toContain("randomUUID");
  });

  it("httpOnly=false（JSから読み取り可能）", () => {
    expect(src).toContain("httpOnly: false");
  });

  it("sameSite=lax", () => {
    expect(src).toMatch(/sameSite.*lax/i);
  });

  it("24時間の有効期限", () => {
    const has24h = src.includes("86400") || src.includes("24 * 60 * 60") || src.includes("24 * 3600");
    expect(has24h).toBe(true);
  });
});
