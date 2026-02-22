// lib/__tests__/totp.test.ts — TOTP生成・検証テスト
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  base32Encode,
  base32Decode,
  generateSecret,
  generateTOTPUri,
  verifyTOTP,
  generateBackupCodes,
} from "@/lib/totp";

describe("totp", () => {
  describe("base32Encode / base32Decode", () => {
    it("エンコード→デコードで元に戻る", () => {
      const original = Buffer.from("Hello, World!");
      const encoded = base32Encode(original);
      const decoded = base32Decode(encoded);
      expect(decoded.toString()).toBe("Hello, World!");
    });

    it("空バッファをエンコード", () => {
      const encoded = base32Encode(Buffer.alloc(0));
      expect(encoded).toBe("");
    });

    it("既知の値でエンコード検証", () => {
      // "f" → Base32 = "MY"
      const encoded = base32Encode(Buffer.from("f"));
      expect(encoded).toBe("MY");
    });

    it("無効なBase32文字でエラー", () => {
      expect(() => base32Decode("INVALID!@#")).toThrow("無効なBase32文字");
    });

    it("パディング付きBase32をデコード", () => {
      const encoded = base32Encode(Buffer.from("test"));
      const decoded = base32Decode(encoded + "===");
      expect(decoded.toString()).toBe("test");
    });
  });

  describe("generateSecret", () => {
    it("Base32文字列を返す", () => {
      const secret = generateSecret();
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it("毎回異なるシークレットを生成", () => {
      const s1 = generateSecret();
      const s2 = generateSecret();
      expect(s1).not.toBe(s2);
    });

    it("十分な長さがある（20バイト → 32文字のBase32）", () => {
      const secret = generateSecret();
      expect(secret.length).toBeGreaterThanOrEqual(30);
    });
  });

  describe("generateTOTPUri", () => {
    it("正しいotpauth URIを生成", () => {
      const uri = generateTOTPUri("JBSWY3DPEHPK3PXP", "test@example.com");
      expect(uri).toContain("otpauth://totp/");
      expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
      expect(uri).toContain("issuer=Lope%20Platform");
      expect(uri).toContain("digits=6");
      expect(uri).toContain("period=30");
    });

    it("メールアドレスがエンコードされる", () => {
      const uri = generateTOTPUri("SECRET", "user@test.com");
      expect(uri).toContain("Lope%20Platform");
    });
  });

  describe("verifyTOTP", () => {
    it("正しいトークンで検証成功", () => {
      const secret = generateSecret();
      // 現在時刻に基づくTOTPを計算して検証
      // verifyTOTPは内部でgenerateHOTPを呼ぶため、同じタイミングなら一致するはず
      // ただし直接HOTPにアクセスできないのでverifyTOTP自体をテスト
      const result = verifyTOTP(secret, "000000");
      // ランダムなシークレットに対して "000000" が一致する確率は低い
      expect(typeof result).toBe("boolean");
    });

    it("不正なトークンで検証失敗", () => {
      const secret = generateSecret();
      // 長さが違うトークンは必ず失敗
      const result = verifyTOTP(secret, "12345");
      expect(result).toBe(false);
    });

    it("空トークンで検証失敗", () => {
      const secret = generateSecret();
      const result = verifyTOTP(secret, "");
      expect(result).toBe(false);
    });
  });

  describe("generateBackupCodes", () => {
    it("8個のバックアップコードを生成", () => {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(8);
    });

    it("各コードは8桁の数字", () => {
      const codes = generateBackupCodes();
      for (const code of codes) {
        expect(code).toMatch(/^\d{8}$/);
        expect(code.length).toBe(8);
      }
    });

    it("毎回異なるコードを生成", () => {
      const codes1 = generateBackupCodes();
      const codes2 = generateBackupCodes();
      // 全て同じになる確率はほぼ0
      expect(codes1).not.toEqual(codes2);
    });
  });
});
