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
      username: "LP-A3K7N",
      password: "secret123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("LP-A3K7N");
    }
  });

  it("ユーザーID空でエラー", () => {
    const result = adminLoginSchema.safeParse({
      username: "",
      password: "secret123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("ユーザーIDは必須です");
    }
  });

  it("パスワード空でエラー", () => {
    const result = adminLoginSchema.safeParse({
      username: "LP-A3K7N",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("パスワードは必須です");
    }
  });

  it("全て空で複数エラー", () => {
    const result = adminLoginSchema.safeParse({
      username: "",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // username(必須) + password(必須) = 2件
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
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

// ---------- adminLoginSchema: 境界値テスト ----------
describe("adminLoginSchema — 境界値", () => {
  it("username 50文字超 → エラー", () => {
    const result = adminLoginSchema.safeParse({
      username: "a".repeat(51),
      password: "pw",
    });
    expect(result.success).toBe(false);
  });

  it("password 200文字超 → エラー", () => {
    const result = adminLoginSchema.safeParse({
      username: "LP-A3K7N",
      password: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("フィールド欠損 → エラー", () => {
    expect(adminLoginSchema.safeParse({ username: "LP-A3K7N" }).success).toBe(false);
    expect(adminLoginSchema.safeParse({}).success).toBe(false);
  });
});

// ---------- checkoutSchema: 詳細テスト ----------
describe("checkoutSchema — 詳細", () => {
  it("productCode 100文字超 → エラー", () => {
    const result = checkoutSchema.safeParse({ productCode: "a".repeat(101), mode: "current" });
    expect(result.success).toBe(false);
  });

  it("mode: current/first/reorder の3種", () => {
    for (const mode of ["current", "first", "reorder"]) {
      expect(checkoutSchema.safeParse({ productCode: "X", mode }).success).toBe(true);
    }
  });

  it("mode 欠損 → OK（optional化済み）", () => {
    expect(checkoutSchema.safeParse({ productCode: "X" }).success).toBe(true);
  });

  it("productCode 欠損 → エラー", () => {
    expect(checkoutSchema.safeParse({ mode: "current" }).success).toBe(false);
  });
});

// ---------- reorderApplySchema: 詳細テスト ----------
describe("reorderApplySchema — 詳細", () => {
  it("productCode 100文字超 → エラー", () => {
    expect(reorderApplySchema.safeParse({ productCode: "a".repeat(101) }).success).toBe(false);
  });

  it("patientId はオプション", () => {
    const result = reorderApplySchema.safeParse({ productCode: "MJL_5mg_1m", patientId: "p-abc" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.patientId).toBe("p-abc");
  });

  it("フィールド欠損 → エラー", () => {
    expect(reorderApplySchema.safeParse({}).success).toBe(false);
  });
});

// ---------- IntakeFormUpdateSchema: 詳細テスト ----------
describe("IntakeFormUpdateSchema — 詳細", () => {
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

  it("field.type が 6種類全て対応", () => {
    const types = ["text", "textarea", "radio", "dropdown", "checkbox", "heading"] as const;
    for (const type of types) {
      const result = IntakeFormUpdateSchema.safeParse({
        fields: [{ ...validField, type }],
        settings: validSettings,
      });
      expect(result.success).toBe(true);
    }
  });

  it("field.label 空文字 → エラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [{ ...validField, label: "" }],
      settings: validSettings,
    });
    expect(result.success).toBe(false);
  });

  it("options の label 空文字 → エラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [{
        ...validField,
        type: "radio",
        options: [{ label: "", value: "x" }],
      }],
      settings: validSettings,
    });
    expect(result.success).toBe(false);
  });

  it("options の value 空文字 → エラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [{
        ...validField,
        type: "radio",
        options: [{ label: "はい", value: "" }],
      }],
      settings: validSettings,
    });
    expect(result.success).toBe(false);
  });

  it("sort_order が負の数 → エラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [{ ...validField, sort_order: -1 }],
      settings: validSettings,
    });
    expect(result.success).toBe(false);
  });

  it("sort_order が小数 → エラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [{ ...validField, sort_order: 1.5 }],
      settings: validSettings,
    });
    expect(result.success).toBe(false);
  });

  it("name 200文字超 → エラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      name: "a".repeat(201),
      fields: [validField],
      settings: validSettings,
    });
    expect(result.success).toBe(false);
  });

  it("settings.ng_block オプション", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [validField],
      settings: {
        ...validSettings,
        ng_block_title: "NGタイトル",
        ng_block_message: "受付不可メッセージ",
      },
    });
    expect(result.success).toBe(true);
  });

  it("fields 空配列 → 成功", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [],
      settings: validSettings,
    });
    expect(result.success).toBe(true);
  });
});

// ---------- parseBody ----------
describe("parseBody", () => {
  it("正常なリクエストで {data} を返す", async () => {
    const body = { username: "LP-A3K7N", password: "pass" };
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
    const body = { username: "", password: "" };
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
