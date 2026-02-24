// lib/__tests__/validations-platform-tenant.test.ts
// テナント管理Zodバリデーションスキーマのテスト
import { describe, it, expect } from "vitest";
import {
  createTenantSchema,
  updateTenantSchema,
  updateTenantStatusSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from "@/lib/validations/platform-tenant";

// ---------- createTenantSchema ----------
describe("createTenantSchema", () => {
  const validInput = {
    name: "テストクリニック",
    slug: "test-clinic",
    adminName: "管理者太郎",
    adminEmail: "admin@example.com",
    adminPassword: "Password123!",
  };

  it("正常値でparse成功（必須フィールドのみ）", () => {
    const result = createTenantSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      // デフォルト値が適用される
      expect(result.data.planName).toBe("standard");
      expect(result.data.monthlyFee).toBe(50000);
      expect(result.data.setupFee).toBe(300000);
    }
  });

  it("正常値でparse成功（全フィールド指定）", () => {
    const result = createTenantSchema.safeParse({
      ...validInput,
      contactEmail: "info@clinic.com",
      contactPhone: "0312345678",
      address: "東京都千代田区1-1-1",
      lineChannelId: "channel-id",
      lineChannelSecret: "channel-secret",
      lineAccessToken: "access-token",
      planName: "premium",
      monthlyFee: 80000,
      setupFee: 500000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.planName).toBe("premium");
    }
  });

  it("name空でparse失敗", () => {
    const result = createTenantSchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("クリニック名は必須です");
    }
  });

  it("nameが100文字超でparse失敗", () => {
    const result = createTenantSchema.safeParse({
      ...validInput,
      name: "あ".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  // --- slugのバリデーション ---
  it("slugが1文字でparse失敗（2文字以上必要）", () => {
    const result = createTenantSchema.safeParse({ ...validInput, slug: "a" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("スラグは2文字以上です");
    }
  });

  it("slugに大文字を含むとparse失敗", () => {
    const result = createTenantSchema.safeParse({
      ...validInput,
      slug: "Test-Clinic",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain(
        "英小文字・数字・ハイフンのみ（先頭末尾はハイフン不可）"
      );
    }
  });

  it("slugがハイフン始まりでparse失敗", () => {
    const result = createTenantSchema.safeParse({
      ...validInput,
      slug: "-test",
    });
    expect(result.success).toBe(false);
  });

  it("slugがハイフン終わりでparse失敗", () => {
    const result = createTenantSchema.safeParse({
      ...validInput,
      slug: "test-",
    });
    expect(result.success).toBe(false);
  });

  it("slugが予約語でparse失敗（refineチェック）", () => {
    const reservedSlugs = [
      "app",
      "admin",
      "www",
      "localhost",
      "127",
      "l-ope",
      "api",
      "platform",
    ];
    for (const slug of reservedSlugs) {
      // 1文字のslugはregexで弾かれるためスキップ
      if (slug.length < 2) continue;
      // regexに合致するslugのみテスト
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) continue;
      const result = createTenantSchema.safeParse({ ...validInput, slug });
      expect(result.success).toBe(false);
      if (!result.success) {
        const msgs = result.error.issues.map((i) => i.message);
        expect(msgs).toContain("この名前は予約済みです");
      }
    }
  });

  it("slugが有効な値でparse成功", () => {
    const validSlugs = ["ab", "my-clinic", "clinic123", "a1b2c3"];
    for (const slug of validSlugs) {
      const result = createTenantSchema.safeParse({ ...validInput, slug });
      expect(result.success).toBe(true);
    }
  });

  it("adminName空でparse失敗", () => {
    const result = createTenantSchema.safeParse({
      ...validInput,
      adminName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("管理者名は必須です");
    }
  });

  it("adminEmailが無効な形式でparse失敗", () => {
    const result = createTenantSchema.safeParse({
      ...validInput,
      adminEmail: "invalid-email",
    });
    expect(result.success).toBe(false);
  });

  it("adminPasswordが7文字でparse失敗（8文字以上必要）", () => {
    const result = createTenantSchema.safeParse({
      ...validInput,
      adminPassword: "1234567",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("パスワードは8文字以上で入力してください");
    }
  });

  it("planNameに無効な値でparse失敗", () => {
    const result = createTenantSchema.safeParse({
      ...validInput,
      planName: "invalid_plan",
    });
    expect(result.success).toBe(false);
  });

  it("monthlyFeeが負数でparse失敗", () => {
    const result = createTenantSchema.safeParse({
      ...validInput,
      monthlyFee: -1,
    });
    expect(result.success).toBe(false);
  });

  it("contactEmailが無効な形式でparse失敗", () => {
    const result = createTenantSchema.safeParse({
      ...validInput,
      contactEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("必須フィールド欠損でparse失敗", () => {
    const result = createTenantSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------- updateTenantSchema ----------
describe("updateTenantSchema", () => {
  it("正常値でparse成功", () => {
    const result = updateTenantSchema.safeParse({
      name: "更新クリニック名",
    });
    expect(result.success).toBe(true);
  });

  it("全フィールド省略でparse成功（全てoptional）", () => {
    const result = updateTenantSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("slugの予約語チェック（refine）", () => {
    const result = updateTenantSchema.safeParse({ slug: "admin" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("この名前は予約済みです");
    }
  });

  it("nullableフィールドにnullを渡してparse成功", () => {
    const result = updateTenantSchema.safeParse({
      contactEmail: null,
      contactPhone: null,
      address: null,
      notes: null,
      logoUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it("logoUrlに無効なURLでparse失敗", () => {
    const result = updateTenantSchema.safeParse({ logoUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("logoUrlに有効なURLでparse成功", () => {
    const result = updateTenantSchema.safeParse({
      logoUrl: "https://example.com/logo.png",
    });
    expect(result.success).toBe(true);
  });
});

// ---------- updateTenantStatusSchema ----------
describe("updateTenantStatusSchema", () => {
  it("isActive=trueでparse成功", () => {
    const result = updateTenantStatusSchema.safeParse({ isActive: true });
    expect(result.success).toBe(true);
  });

  it("isActive=falseでparse成功", () => {
    const result = updateTenantStatusSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it("isActive欠損でparse失敗", () => {
    const result = updateTenantStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("isActiveが文字列でparse失敗", () => {
    const result = updateTenantStatusSchema.safeParse({ isActive: "true" });
    expect(result.success).toBe(false);
  });
});

// ---------- addMemberSchema ----------
describe("addMemberSchema", () => {
  const validMember = {
    name: "スタッフ花子",
    email: "staff@example.com",
    password: "Password123!",
  };

  it("正常値でparse成功（デフォルトrole=admin）", () => {
    const result = addMemberSchema.safeParse(validMember);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("admin");
    }
  });

  it("role指定でparse成功", () => {
    const roles = ["admin", "owner", "viewer"] as const;
    for (const role of roles) {
      const result = addMemberSchema.safeParse({ ...validMember, role });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe(role);
      }
    }
  });

  it("無効なroleでparse失敗", () => {
    const result = addMemberSchema.safeParse({
      ...validMember,
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });

  it("name空でparse失敗", () => {
    const result = addMemberSchema.safeParse({ ...validMember, name: "" });
    expect(result.success).toBe(false);
  });

  it("emailが無効な形式でparse失敗", () => {
    const result = addMemberSchema.safeParse({
      ...validMember,
      email: "bad",
    });
    expect(result.success).toBe(false);
  });

  it("passwordが7文字でparse失敗", () => {
    const result = addMemberSchema.safeParse({
      ...validMember,
      password: "1234567",
    });
    expect(result.success).toBe(false);
  });

  it("必須フィールド欠損でparse失敗", () => {
    const result = addMemberSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------- updateMemberRoleSchema ----------
describe("updateMemberRoleSchema", () => {
  it("有効なroleでparse成功", () => {
    const roles = ["admin", "owner", "viewer"] as const;
    for (const role of roles) {
      const result = updateMemberRoleSchema.safeParse({ role });
      expect(result.success).toBe(true);
    }
  });

  it("無効なroleでparse失敗", () => {
    const result = updateMemberRoleSchema.safeParse({ role: "manager" });
    expect(result.success).toBe(false);
  });

  it("role欠損でparse失敗", () => {
    const result = updateMemberRoleSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
