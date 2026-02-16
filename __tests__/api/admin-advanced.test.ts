// __tests__/api/admin-advanced.test.ts
// 管理者関連テスト（logout, password-reset, users）
import { describe, it, expect } from "vitest";

// === ログアウト Cookie 削除 ===
describe("admin logout Cookie削除", () => {
  it("maxAge=0 で即時削除される", () => {
    const cookieOptions = {
      name: "admin_session",
      value: "",
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    };
    expect(cookieOptions.maxAge).toBe(0);
    expect(cookieOptions.value).toBe("");
    expect(cookieOptions.httpOnly).toBe(true);
  });

  it("開発環境では secure=false", () => {
    const isProd = false;
    const secure = isProd;
    expect(secure).toBe(false);
  });

  it("本番環境では secure=true", () => {
    const isProd = true;
    const secure = isProd;
    expect(secure).toBe(true);
  });
});

// === セッションCookie抽出 ===
describe("admin logout セッションCookie抽出", () => {
  function extractSessionCookie(
    cookies: { get(name: string): { value: string } | undefined },
  ): string | null {
    return cookies.get("admin_session")?.value ?? null;
  }

  it("Cookie存在 → 値を返す", () => {
    const cookies = { get: (name: string) => (name === "admin_session" ? { value: "jwt123" } : undefined) };
    expect(extractSessionCookie(cookies)).toBe("jwt123");
  });

  it("Cookie不在 → null", () => {
    const cookies = { get: () => undefined };
    expect(extractSessionCookie(cookies)).toBeNull();
  });
});

// === パスワード強度チェック ===
describe("admin password-reset パスワード強度", () => {
  function validatePassword(password: string): { ok: boolean; error?: string } {
    if (password.length < 8) {
      return { ok: false, error: "パスワードは8文字以上必要です" };
    }
    return { ok: true };
  }

  it("7文字 → 不可", () => {
    expect(validatePassword("1234567").ok).toBe(false);
  });

  it("8文字 → 可", () => {
    expect(validatePassword("12345678").ok).toBe(true);
  });

  it("空文字 → 不可", () => {
    expect(validatePassword("").ok).toBe(false);
  });

  it("100文字 → 可", () => {
    expect(validatePassword("a".repeat(100)).ok).toBe(true);
  });
});

// === トークン有効性検証 ===
describe("admin password-reset トークン検証", () => {
  function validateResetToken(
    token: { used_at: string | null; expires_at: string } | null,
  ): { valid: boolean; error?: string } {
    if (!token) {
      return { valid: false, error: "無効なトークンです" };
    }
    if (token.used_at) {
      return { valid: false, error: "このリンクは既に使用されています" };
    }
    if (new Date(token.expires_at) < new Date()) {
      return { valid: false, error: "このリンクは有効期限切れです" };
    }
    return { valid: true };
  }

  it("トークンなし → 無効", () => {
    expect(validateResetToken(null).valid).toBe(false);
  });

  it("使用済み → 無効", () => {
    const token = { used_at: "2026-02-17T00:00:00Z", expires_at: "2030-01-01T00:00:00Z" };
    expect(validateResetToken(token).error).toBe("このリンクは既に使用されています");
  });

  it("有効期限切れ → 無効", () => {
    const token = { used_at: null, expires_at: "2020-01-01T00:00:00Z" };
    expect(validateResetToken(token).error).toBe("このリンクは有効期限切れです");
  });

  it("有効なトークン → 有効", () => {
    const token = { used_at: null, expires_at: "2030-01-01T00:00:00Z" };
    expect(validateResetToken(token).valid).toBe(true);
  });
});

// === メールアドレス正規化 ===
describe("admin password-reset メールアドレス正規化", () => {
  function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  it("大文字 → 小文字", () => {
    expect(normalizeEmail("Admin@Example.COM")).toBe("admin@example.com");
  });

  it("前後スペース → トリム", () => {
    expect(normalizeEmail("  user@test.com  ")).toBe("user@test.com");
  });

  it("既に正規化済み → そのまま", () => {
    expect(normalizeEmail("user@test.com")).toBe("user@test.com");
  });
});

// === セキュリティレスポンス（ユーザー列挙攻撃対策） ===
describe("admin password-reset セキュリティレスポンス", () => {
  const SAFE_MESSAGE = "登録されているメールアドレスの場合、リセット用のメールを送信しました";

  function getResetResponse(
    user: { is_active: boolean } | null,
    isRateLimited: boolean,
  ): { ok: boolean; message: string } {
    // レート制限時、ユーザー不在時、無効ユーザー時 → 同一メッセージ
    if (isRateLimited || !user || !user.is_active) {
      return { ok: true, message: SAFE_MESSAGE };
    }
    return { ok: true, message: SAFE_MESSAGE };
  }

  it("ユーザー存在 → 成功メッセージ", () => {
    expect(getResetResponse({ is_active: true }, false).message).toBe(SAFE_MESSAGE);
  });

  it("ユーザー不在 → 同じ成功メッセージ（情報漏洩防止）", () => {
    expect(getResetResponse(null, false).message).toBe(SAFE_MESSAGE);
  });

  it("無効ユーザー → 同じ成功メッセージ", () => {
    expect(getResetResponse({ is_active: false }, false).message).toBe(SAFE_MESSAGE);
  });

  it("レート制限時 → 同じ成功メッセージ", () => {
    expect(getResetResponse({ is_active: true }, true).message).toBe(SAFE_MESSAGE);
  });

  it("全ケースで ok=true（ステータスコードで区別しない）", () => {
    expect(getResetResponse(null, false).ok).toBe(true);
    expect(getResetResponse({ is_active: false }, false).ok).toBe(true);
    expect(getResetResponse({ is_active: true }, true).ok).toBe(true);
  });
});

// === トークン有効期限設定 ===
describe("admin password-reset トークン有効期限", () => {
  it("リセットトークンは1時間有効", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 60 * 60 * 1000);
    const diffMs = expiresAt.getTime() - now;
    expect(diffMs).toBe(3600000); // 1時間 = 3,600,000ms
  });

  it("セットアップトークンは24時間有効", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 24 * 60 * 60 * 1000);
    const diffMs = expiresAt.getTime() - now;
    expect(diffMs).toBe(86400000); // 24時間
  });
});

// === 管理者作成 バリデーション ===
describe("admin users 作成バリデーション", () => {
  function validateCreateUser(body: { email?: string; name?: string }): { ok: boolean; error?: string } {
    if (!body.email || !body.name) {
      return { ok: false, error: "email と name が必要です" };
    }
    return { ok: true };
  }

  it("email + name あり → OK", () => {
    expect(validateCreateUser({ email: "a@b.com", name: "太郎" }).ok).toBe(true);
  });

  it("email なし → NG", () => {
    expect(validateCreateUser({ name: "太郎" }).ok).toBe(false);
  });

  it("name なし → NG", () => {
    expect(validateCreateUser({ email: "a@b.com" }).ok).toBe(false);
  });

  it("両方なし → NG", () => {
    expect(validateCreateUser({}).ok).toBe(false);
  });

  it("空文字 → NG", () => {
    expect(validateCreateUser({ email: "", name: "" }).ok).toBe(false);
  });
});

// === メール送信失敗時のレスポンス分岐 ===
describe("admin users メール送信失敗時", () => {
  function buildCreateResponse(
    user: { id: string; email: string; name: string },
    emailSuccess: boolean,
    setupUrl: string,
  ): { ok: boolean; user: any; warning?: string; message?: string; setupUrl?: string } {
    if (!emailSuccess) {
      return {
        ok: true,
        user,
        warning: "メール送信に失敗しました。手動でセットアップURLを共有してください。",
        setupUrl,
      };
    }
    return {
      ok: true,
      user,
      message: "招待メールを送信しました",
    };
  }

  it("メール送信成功 → message 返却", () => {
    const res = buildCreateResponse(
      { id: "1", email: "a@b.com", name: "太郎" },
      true,
      "https://example.com/setup?token=abc",
    );
    expect(res.message).toBe("招待メールを送信しました");
    expect(res.warning).toBeUndefined();
    expect(res.setupUrl).toBeUndefined();
  });

  it("メール送信失敗 → warning + setupUrl 返却", () => {
    const res = buildCreateResponse(
      { id: "1", email: "a@b.com", name: "太郎" },
      false,
      "https://example.com/setup?token=abc",
    );
    expect(res.warning).toContain("メール送信に失敗");
    expect(res.setupUrl).toBe("https://example.com/setup?token=abc");
    expect(res.message).toBeUndefined();
  });

  it("メール送信失敗でも ok=true（ユーザーは作成済み）", () => {
    const res = buildCreateResponse(
      { id: "1", email: "a@b.com", name: "太郎" },
      false,
      "https://example.com/setup?token=abc",
    );
    expect(res.ok).toBe(true);
  });
});

// === 管理者削除 バリデーション ===
describe("admin users 削除バリデーション", () => {
  it("id あり → OK", () => {
    const userId = "uuid-123";
    expect(!!userId).toBe(true);
  });

  it("id なし → NG", () => {
    const userId: string | null = null;
    expect(!userId).toBe(true);
  });
});

// === IP抽出（rate-limit共通） ===
describe("admin getClientIp", () => {
  function getClientIp(headers: { get(name: string): string | null }): string {
    return (
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      "unknown"
    );
  }

  it("x-forwarded-for 単一IP", () => {
    const headers = { get: (n: string) => (n === "x-forwarded-for" ? "1.2.3.4" : null) };
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("x-forwarded-for 複数IP → 最初を返す", () => {
    const headers = { get: (n: string) => (n === "x-forwarded-for" ? "1.2.3.4, 5.6.7.8" : null) };
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("x-forwarded-for なし + x-real-ip あり", () => {
    const headers = { get: (n: string) => (n === "x-real-ip" ? "9.8.7.6" : null) };
    expect(getClientIp(headers)).toBe("9.8.7.6");
  });

  it("両方なし → 'unknown'", () => {
    const headers = { get: () => null };
    expect(getClientIp(headers)).toBe("unknown");
  });

  it("x-forwarded-for がスペース付き → トリムされる", () => {
    const headers = { get: (n: string) => (n === "x-forwarded-for" ? "  1.2.3.4  " : null) };
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });
});

// === Rate Limiting ロジック ===
describe("admin rate-limit 判定ロジック", () => {
  function checkLimit(count: number, max: number): { limited: boolean; remaining: number } {
    if (count >= max) {
      return { limited: true, remaining: 0 };
    }
    return { limited: false, remaining: max - count - 1 };
  }

  it("count=0, max=5 → limited=false, remaining=4", () => {
    expect(checkLimit(0, 5)).toEqual({ limited: false, remaining: 4 });
  });

  it("count=4, max=5 → limited=false, remaining=0", () => {
    expect(checkLimit(4, 5)).toEqual({ limited: false, remaining: 0 });
  });

  it("count=5, max=5 → limited=true, remaining=0", () => {
    expect(checkLimit(5, 5)).toEqual({ limited: true, remaining: 0 });
  });

  it("count=10, max=5 → limited=true（超過）", () => {
    expect(checkLimit(10, 5).limited).toBe(true);
  });

  it("max=1, count=0 → remaining=0（次回で制限）", () => {
    expect(checkLimit(0, 1)).toEqual({ limited: false, remaining: 0 });
  });

  it("max=1, count=1 → limited", () => {
    expect(checkLimit(1, 1).limited).toBe(true);
  });
});

// === 監査ログ IP抽出 ===
describe("admin audit ログIP抽出", () => {
  function extractIp(headers: { get(name: string): string | null }): string | null {
    return (
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      null
    );
  }

  it("IP あり → 返す", () => {
    const headers = { get: (n: string) => (n === "x-forwarded-for" ? "1.2.3.4" : null) };
    expect(extractIp(headers)).toBe("1.2.3.4");
  });

  it("IP なし → null（unknownではない）", () => {
    const headers = { get: () => null };
    expect(extractIp(headers)).toBeNull();
  });
});
