// lib/__tests__/crypto.test.ts
// AES-256-GCM 暗号化/復号 & マスク関数のテスト
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 環境変数を設定してからインポート
const TEST_KEY_HEX = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64文字hex = 32バイト
const TEST_KEY_SHORT = "my-secret-key-for-test"; // sha256でハッシュされる

describe("crypto — encrypt / decrypt ラウンドトリップ", () => {
  beforeEach(() => {
    process.env.SETTINGS_ENCRYPTION_KEY = TEST_KEY_HEX;
  });

  afterEach(() => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
    vi.resetModules();
  });

  it("暗号化 → 復号で元の文字列に戻る", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const plaintext = "LINE_CHANNEL_SECRET_abc123";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("暗号化結果は iv:tag:ciphertext の3パート形式", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    expect(parts.length).toBe(3);
    // IV: 12バイト = 24文字hex
    expect(parts[0].length).toBe(24);
    // Tag: 16バイト = 32文字hex
    expect(parts[1].length).toBe(32);
    // Ciphertext: 可変長hex
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("同じ平文でも暗号化結果が毎回異なる（IVがランダム）", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const plaintext = "same-text";
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2); // IVが異なるため
  });

  it("日本語テキストの暗号化/復号", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const plaintext = "テナント設定の機密値を保護";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("空文字列の暗号化/復号", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("長い文字列の暗号化/復号", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const plaintext = "a".repeat(10000);
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});

describe("crypto — decrypt エラー処理", () => {
  beforeEach(() => {
    process.env.SETTINGS_ENCRYPTION_KEY = TEST_KEY_HEX;
  });

  afterEach(() => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
    vi.resetModules();
  });

  it("不正なフォーマット（パート数不足）でエラー", async () => {
    const { decrypt } = await import("@/lib/crypto");
    expect(() => decrypt("only-one-part")).toThrow("Invalid encrypted data format");
  });

  it("不正なフォーマット（パート数超過）でエラー", async () => {
    const { decrypt } = await import("@/lib/crypto");
    expect(() => decrypt("a:b:c:d")).toThrow("Invalid encrypted data format");
  });

  it("改ざんされた暗号文は復号失敗", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const encrypted = encrypt("secret");
    const parts = encrypted.split(":");
    // ciphertext を完全に別の値に置換（GCM認証が確実に失敗する）
    parts[2] = "00".repeat(parts[2].length / 2);
    expect(() => decrypt(parts.join(":"))).toThrow();
  });

  it("改ざんされたタグは復号失敗", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const encrypted = encrypt("secret");
    const parts = encrypted.split(":");
    // tag を改ざん
    parts[1] = "00".repeat(16);
    expect(() => decrypt(parts.join(":"))).toThrow();
  });
});

describe("crypto — 鍵フォーマット", () => {
  afterEach(() => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
    vi.resetModules();
  });

  it("64文字hex鍵で暗号化/復号成功", async () => {
    process.env.SETTINGS_ENCRYPTION_KEY = TEST_KEY_HEX;
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const decrypted = decrypt(encrypt("test-hex"));
    expect(decrypted).toBe("test-hex");
  });

  it("短い鍵はSHA-256でハッシュされて使用可能", async () => {
    process.env.SETTINGS_ENCRYPTION_KEY = TEST_KEY_SHORT;
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const decrypted = decrypt(encrypt("test-short"));
    expect(decrypted).toBe("test-short");
  });

  it("環境変数未設定でエラー", async () => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
    try {
      const mod = await import("@/lib/crypto");
      // encrypt を呼ぶと getEncryptionKey で throw
      expect(() => mod.encrypt("test")).toThrow("SETTINGS_ENCRYPTION_KEY");
    } catch (e: any) {
      // モジュール読み込み時にthrowする可能性もある
      expect(e.message).toContain("SETTINGS_ENCRYPTION_KEY");
    }
  });
});

describe("crypto — maskValue", () => {
  beforeEach(() => {
    process.env.SETTINGS_ENCRYPTION_KEY = TEST_KEY_HEX;
  });

  afterEach(() => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
    vi.resetModules();
  });

  it("5文字以上は末尾4文字のみ表示", async () => {
    const { maskValue } = await import("@/lib/crypto");
    expect(maskValue("abcdefgh")).toBe("****efgh");
  });

  it("10文字は前6文字をマスク", async () => {
    const { maskValue } = await import("@/lib/crypto");
    expect(maskValue("1234567890")).toBe("******7890");
  });

  it("4文字以下は全マスク", async () => {
    const { maskValue } = await import("@/lib/crypto");
    expect(maskValue("abc")).toBe("****");
    expect(maskValue("abcd")).toBe("****");
  });

  it("1文字は全マスク", async () => {
    const { maskValue } = await import("@/lib/crypto");
    expect(maskValue("a")).toBe("****");
  });

  it("空文字は全マスク", async () => {
    const { maskValue } = await import("@/lib/crypto");
    expect(maskValue("")).toBe("****");
  });
});
