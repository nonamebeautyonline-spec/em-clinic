// lib/__tests__/validations-square-pay.test.ts
// inlinePaySchema のバリデーションテスト
import { describe, it, expect } from "vitest";
import { inlinePaySchema } from "@/lib/validations/square-pay";

const validInput = {
  sourceId: "cnon:CARD_NONCE_123",
  productCode: "MJL_2.5mg_1m",
  mode: "current" as const,
  patientId: "PID_001",
  reorderId: null,
  saveCard: true,
  shipping: {
    name: "山田太郎",
    postalCode: "160-0023",
    address: "東京都新宿区西新宿1-1-1",
    phone: "09012345678",
    email: "test@example.com",
  },
};

describe("inlinePaySchema", () => {
  it("正常入力でパスする", () => {
    const result = inlinePaySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("mode=reorder でパスする", () => {
    const result = inlinePaySchema.safeParse({ ...validInput, mode: "reorder", reorderId: "42" });
    expect(result.success).toBe(true);
  });

  it("mode=first でパスする", () => {
    const result = inlinePaySchema.safeParse({ ...validInput, mode: "first" });
    expect(result.success).toBe(true);
  });

  it("mode 省略でもパスする", () => {
    const { mode, ...noMode } = validInput;
    const result = inlinePaySchema.safeParse(noMode);
    expect(result.success).toBe(true);
  });

  it("saveCard 省略時はデフォルト true", () => {
    const { saveCard, ...noSave } = validInput;
    const result = inlinePaySchema.safeParse(noSave);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.saveCard).toBe(true);
  });

  it("sourceId 空文字でエラー", () => {
    const result = inlinePaySchema.safeParse({ ...validInput, sourceId: "" });
    expect(result.success).toBe(false);
  });

  it("productCode 空文字でエラー", () => {
    const result = inlinePaySchema.safeParse({ ...validInput, productCode: "" });
    expect(result.success).toBe(false);
  });

  it("patientId 空文字でエラー", () => {
    const result = inlinePaySchema.safeParse({ ...validInput, patientId: "" });
    expect(result.success).toBe(false);
  });

  it("不正な mode でエラー", () => {
    const result = inlinePaySchema.safeParse({ ...validInput, mode: "invalid" });
    expect(result.success).toBe(false);
  });

  it("shipping.name 空でエラー", () => {
    const result = inlinePaySchema.safeParse({
      ...validInput,
      shipping: { ...validInput.shipping, name: "" },
    });
    expect(result.success).toBe(false);
  });

  it("shipping.email 不正でエラー", () => {
    const result = inlinePaySchema.safeParse({
      ...validInput,
      shipping: { ...validInput.shipping, email: "not-an-email" },
    });
    expect(result.success).toBe(false);
  });

  it("shipping 自体が欠けるとエラー", () => {
    const { shipping, ...noShipping } = validInput;
    const result = inlinePaySchema.safeParse(noShipping);
    expect(result.success).toBe(false);
  });

  it("productCode が100文字超でエラー", () => {
    const result = inlinePaySchema.safeParse({
      ...validInput,
      productCode: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("保存済みカードID (ccof:) でもパスする", () => {
    const result = inlinePaySchema.safeParse({ ...validInput, sourceId: "ccof:CARD_ID_456" });
    expect(result.success).toBe(true);
  });
});
