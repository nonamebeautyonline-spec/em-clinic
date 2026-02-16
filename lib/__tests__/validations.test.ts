// lib/__tests__/validations.test.ts
// Zodバリデーションスキーマ & parseBody ヘルパーのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/validations/admin-login";
import { checkoutSchema } from "@/lib/validations/checkout";
import { reorderApplySchema } from "@/lib/validations/reorder";
import { IntakeFormUpdateSchema } from "@/lib/validations/intake-form";
import { parseBody } from "@/lib/validations/helpers";

// ---------- adminLoginSchema ----------
describe("adminLoginSchema", () => {
  it("正常入力でパスする", () => {
    const result = adminLoginSchema.safeParse({
      email: "admin@example.com",
      password: "secret123",
      token: "totp-token",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("admin@example.com");
    }
  });

  it("メールアドレス不正でエラー", () => {
    const result = adminLoginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
      token: "totp-token",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("メールアドレスの形式が不正です");
    }
  });

  it("パスワード空でエラー", () => {
    const result = adminLoginSchema.safeParse({
      email: "admin@example.com",
      password: "",
      token: "totp-token",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("パスワードは必須です");
    }
  });

  it("トークン空でエラー", () => {
    const result = adminLoginSchema.safeParse({
      email: "admin@example.com",
      password: "secret123",
      token: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("トークンは必須です");
    }
  });

  it("全て空で複数エラー", () => {
    const result = adminLoginSchema.safeParse({
      email: "",
      password: "",
      token: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // email(形式不正) + password(必須) + token(必須) = 3件以上
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ---------- checkoutSchema ----------
describe("checkoutSchema", () => {
  it("正常入力でパスする", () => {
    const result = checkoutSchema.safeParse({
      productCode: "PROD-001",
      mode: "first",
      patientId: "patient-123",
      reorderId: "reorder-456",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe("first");
    }
  });

  it("productCode空でエラー", () => {
    const result = checkoutSchema.safeParse({
      productCode: "",
      mode: "current",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("商品コードは必須です");
    }
  });

  it("mode不正値でエラー", () => {
    const result = checkoutSchema.safeParse({
      productCode: "PROD-001",
      mode: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("patientId/reorderIdはオプショナルで省略可", () => {
    const result = checkoutSchema.safeParse({
      productCode: "PROD-001",
      mode: "reorder",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.patientId).toBeUndefined();
      expect(result.data.reorderId).toBeUndefined();
    }
  });
});

// ---------- reorderApplySchema ----------
describe("reorderApplySchema", () => {
  it("正常入力でパスする", () => {
    const result = reorderApplySchema.safeParse({
      productCode: "PROD-001",
      patientId: "patient-123",
    });
    expect(result.success).toBe(true);
  });

  it("productCode空でエラー", () => {
    const result = reorderApplySchema.safeParse({
      productCode: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("商品コードは必須です");
    }
  });
});

// ---------- IntakeFormUpdateSchema ----------
describe("IntakeFormUpdateSchema", () => {
  const validField = {
    id: "field-1",
    type: "text" as const,
    label: "お名前",
    required: true,
    sort_order: 0,
  };

  const validSettings = {
    step_by_step: true,
    header_title: "問診票",
  };

  it("正常入力でパスする", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      name: "初回問診",
      fields: [validField],
      settings: validSettings,
    });
    expect(result.success).toBe(true);
  });

  it("fieldsが正しい構造でパスする", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [
        validField,
        {
          id: "field-2",
          type: "radio",
          label: "性別",
          required: true,
          sort_order: 1,
          options: [
            { label: "男性", value: "male" },
            { label: "女性", value: "female" },
          ],
          conditional: { when: "field-1", value: "特定値" },
          ng_block: true,
          ng_block_value: "male",
          ng_block_message: "男性は対象外です",
        },
      ],
      settings: validSettings,
    });
    expect(result.success).toBe(true);
  });

  it("fieldsのtypeが不正でエラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [{ ...validField, type: "invalid_type" }],
      settings: validSettings,
    });
    expect(result.success).toBe(false);
  });

  it("settingsのheader_title空でエラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [validField],
      settings: { ...validSettings, header_title: "" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("ヘッダータイトルは必須です");
    }
  });
});

// ---------- parseBody ----------
describe("parseBody", () => {
  it("正常なリクエストで {data} を返す", async () => {
    const body = { email: "test@example.com", password: "pass", token: "tok" };
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const result = await parseBody(req, adminLoginSchema);
    expect(result.data).toEqual(body);
    expect(result.error).toBeUndefined();
  });

  it("Zodバリデーションエラーで {error: 400レスポンス} を返す", async () => {
    const body = { email: "bad", password: "", token: "" };
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const result = await parseBody(req, adminLoginSchema);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(NextResponse);
    expect(result.error!.status).toBe(400);

    const json = await result.error!.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("入力値が不正です");
    expect(json.details).toBeDefined();
    expect(json.details.length).toBeGreaterThan(0);
  });

  it("JSONパースエラーで {error: 400} を返す", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      method: "POST",
      body: "not-json{{{",
      headers: { "Content-Type": "application/json" },
    });
    const result = await parseBody(req, adminLoginSchema);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(NextResponse);
    expect(result.error!.status).toBe(400);

    const json = await result.error!.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("リクエストの形式が不正です");
  });
});
