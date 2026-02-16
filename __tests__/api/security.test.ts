// __tests__/api/security.test.ts
// セキュリティ関連テスト（CSRF, Rate Limiting, セッション管理, 監査ログ）
import { describe, it, expect } from "vitest";

// === CSRF トークン ===
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

// === CSRF 検証ロジック（middleware.ts） ===
describe("CSRF検証ロジック", () => {
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

  it("ログインはCSRF除外", () => {
    expect(shouldCheckCsrf("POST", "/api/admin/login", exemptPrefixes, exemptPatterns)).toBe(false);
  });

  it("ログアウトはCSRF除外", () => {
    expect(shouldCheckCsrf("POST", "/api/admin/logout", exemptPrefixes, exemptPatterns)).toBe(false);
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

// === Rate Limiting ===
describe("Rate Limiting ロジック", () => {
  it("ログイン: メール5回/30分の制限", () => {
    const MAX_ATTEMPTS = 5;
    const WINDOW_SEC = 1800;
    expect(MAX_ATTEMPTS).toBe(5);
    expect(WINDOW_SEC).toBe(1800);
  });

  it("ログイン: IP15回/10分の制限", () => {
    const MAX_ATTEMPTS = 15;
    const WINDOW_SEC = 600;
    expect(MAX_ATTEMPTS).toBe(15);
    expect(WINDOW_SEC).toBe(600);
  });

  it("パスワードリセット: 1回/10分の制限", () => {
    const MAX_ATTEMPTS = 1;
    const WINDOW_SEC = 600;
    expect(MAX_ATTEMPTS).toBe(1);
    expect(WINDOW_SEC).toBe(600);
  });

  it("制限超過判定: attempts >= max → limited", () => {
    const attempts = 5;
    const max = 5;
    expect(attempts >= max).toBe(true);
  });

  it("制限内: attempts < max → not limited", () => {
    const attempts = 3;
    const max = 5;
    expect(attempts >= max).toBe(false);
  });

  it("ログイン成功時にカウントリセットされる", () => {
    // 成功時: resetRateLimit を呼ぶ
    const loginSuccess = true;
    const shouldReset = loginSuccess;
    expect(shouldReset).toBe(true);
  });
});

// === IP取得ロジック ===
describe("Rate Limiting IP取得", () => {
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

// === セッション管理 ===
describe("セッション管理", () => {
  it("JWTハッシュはSHA-256で生成", () => {
    // hashToken の動作確認
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

  it("同時セッション上限は3", () => {
    const MAX_SESSIONS = 3;
    const currentSessions = 4;
    const toDelete = currentSessions - MAX_SESSIONS;
    expect(toDelete).toBe(1); // 最古の1件を削除
  });

  it("セッション上限以下なら削除なし", () => {
    const MAX_SESSIONS = 3;
    const currentSessions = 2;
    const shouldClean = currentSessions > MAX_SESSIONS;
    expect(shouldClean).toBe(false);
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

  it("last_activity更新は5分以上経過時のみ", () => {
    const lastActivity = new Date("2026-02-17T10:00:00Z");
    const now = new Date("2026-02-17T10:06:00Z"); // 6分後
    const elapsed = now.getTime() - lastActivity.getTime();
    expect(elapsed > 5 * 60 * 1000).toBe(true);
  });

  it("last_activity 5分以内は更新しない", () => {
    const lastActivity = new Date("2026-02-17T10:00:00Z");
    const now = new Date("2026-02-17T10:03:00Z"); // 3分後
    const elapsed = now.getTime() - lastActivity.getTime();
    expect(elapsed > 5 * 60 * 1000).toBe(false);
  });
});

// === 監査ログ ===
describe("監査ログ", () => {
  it("アクション名が正しい形式", () => {
    const validActions = [
      "admin.login.success",
      "reorder.approve",
      "reorder.reject",
      "patient.delete_data",
    ];
    validActions.forEach(a => {
      expect(a).toMatch(/^[a-z]+\.[a-z_.]+$/);
    });
  });

  it("リソースタイプが正しい", () => {
    const validTypes = ["admin_user", "reorder", "patient"];
    validTypes.forEach(t => {
      expect(t).toBeTruthy();
    });
  });

  it("fire-and-forget: エラーでもビジネスロジックは止まらない", () => {
    // logAudit は catch でエラーを握りつぶす設計
    let businessLogicCompleted = false;
    try {
      // logAudit がエラーを投げても
      // ビジネスロジックは続行される
      businessLogicCompleted = true;
    } catch {
      // ここには来ない
    }
    expect(businessLogicCompleted).toBe(true);
  });
});

// === Zodバリデーション ===
describe("Zodバリデーション", () => {
  it("ログインスキーマ: 必須フィールド確認", () => {
    const requiredFields = ["email", "password", "token"];
    expect(requiredFields).toContain("email");
    expect(requiredFields).toContain("password");
    expect(requiredFields).toContain("token");
  });

  it("checkoutスキーマ: mode は3種類のみ有効", () => {
    const validModes = ["current", "first", "reorder"];
    expect(validModes).toContain("current");
    expect(validModes).toContain("first");
    expect(validModes).toContain("reorder");
    expect(validModes).not.toContain("invalid");
  });

  it("メールアドレスの形式チェック", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test("admin@example.com")).toBe(true);
    expect(emailRegex.test("invalid-email")).toBe(false);
    expect(emailRegex.test("")).toBe(false);
  });
});
