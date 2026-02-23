// lib/__tests__/validations-platform.test.ts
// プラットフォーム管理Zodバリデーションスキーマのテスト
import { describe, it, expect } from "vitest";
import {
  impersonateSchema,
  totpVerifySchema,
  totpLoginSchema,
  totpDisableSchema,
} from "@/lib/validations/platform";

// ---------- impersonateSchema ----------
describe("impersonateSchema", () => {
  it("正常値でparse成功", () => {
    const result = impersonateSchema.safeParse({
      tenantId: "tenant-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tenantId).toBe("tenant-123");
    }
  });

  it("tenantIdが空文字でparse失敗", () => {
    const result = impersonateSchema.safeParse({ tenantId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("tenantIdは必須です");
    }
  });

  it("tenantId欠損でparse失敗", () => {
    const result = impersonateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = impersonateSchema.safeParse({
      tenantId: "tenant-123",
      reason: "サポート対応",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("サポート対応");
    }
  });
});

// ---------- totpVerifySchema ----------
describe("totpVerifySchema", () => {
  it("正常値でparse成功（必須フィールドのみ）", () => {
    const result = totpVerifySchema.safeParse({
      secret: "JBSWY3DPEHPK3PXP",
      token: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("正常値でparse成功（backupCodes付き）", () => {
    const result = totpVerifySchema.safeParse({
      secret: "JBSWY3DPEHPK3PXP",
      token: "123456",
      backupCodes: ["code1", "code2", "code3"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.backupCodes).toHaveLength(3);
    }
  });

  it("secretが空文字でparse失敗", () => {
    const result = totpVerifySchema.safeParse({
      secret: "",
      token: "123456",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("シークレットは必須です");
    }
  });

  it("tokenが空文字でparse失敗", () => {
    const result = totpVerifySchema.safeParse({
      secret: "JBSWY3DPEHPK3PXP",
      token: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("コードは必須です");
    }
  });

  it("必須フィールド欠損でparse失敗", () => {
    const result = totpVerifySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = totpVerifySchema.safeParse({
      secret: "JBSWY3DPEHPK3PXP",
      token: "123456",
      deviceName: "iPhone",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deviceName).toBe("iPhone");
    }
  });
});

// ---------- totpLoginSchema ----------
describe("totpLoginSchema", () => {
  it("正常値でparse成功", () => {
    const result = totpLoginSchema.safeParse({
      pendingTotpToken: "pending-token-xyz",
      token: "654321",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pendingTotpToken).toBe("pending-token-xyz");
      expect(result.data.token).toBe("654321");
    }
  });

  it("pendingTotpTokenが空文字でparse失敗", () => {
    const result = totpLoginSchema.safeParse({
      pendingTotpToken: "",
      token: "654321",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("仮トークンは必須です");
    }
  });

  it("tokenが空文字でparse失敗", () => {
    const result = totpLoginSchema.safeParse({
      pendingTotpToken: "pending-token-xyz",
      token: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("認証コードは必須です");
    }
  });

  it("必須フィールド欠損でparse失敗", () => {
    const result = totpLoginSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = totpLoginSchema.safeParse({
      pendingTotpToken: "token",
      token: "123456",
      rememberDevice: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rememberDevice).toBe(true);
    }
  });
});

// ---------- totpDisableSchema ----------
describe("totpDisableSchema", () => {
  it("正常値でparse成功", () => {
    const result = totpDisableSchema.safeParse({
      token: "123456",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe("123456");
    }
  });

  it("tokenが空文字でparse失敗", () => {
    const result = totpDisableSchema.safeParse({ token: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("確認コードは必須です");
    }
  });

  it("token欠損でparse失敗", () => {
    const result = totpDisableSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = totpDisableSchema.safeParse({
      token: "123456",
      confirmMessage: "本当に無効化しますか",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confirmMessage).toBe("本当に無効化しますか");
    }
  });
});
