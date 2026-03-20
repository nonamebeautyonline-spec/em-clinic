// lib/__tests__/validations-boundary.test.ts
// Zodバリデーション — 境界値テスト（checkout, register, doctor スキーマ）
import { describe, it, expect } from "vitest";
import { checkoutSchema } from "@/lib/validations/checkout";
import { registerCompleteSchema } from "@/lib/validations/register";
import {
  doctorUpdateSchema,
  callStatusSchema,
  doctorReorderApproveSchema,
  sendCallFormSchema,
  doctorReorderRejectSchema,
} from "@/lib/validations/doctor";

// ========== checkoutSchema — 境界値 ==========
describe("checkoutSchema — 境界値テスト", () => {
  // 空文字列の検証
  it("productCode 空文字 → エラー", () => {
    const result = checkoutSchema.safeParse({ productCode: "", mode: "current" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("商品コードは必須です");
    }
  });

  // 最大長の境界値
  it("productCode ちょうど100文字 → 成功", () => {
    const result = checkoutSchema.safeParse({ productCode: "x".repeat(100), mode: "first" });
    expect(result.success).toBe(true);
  });

  it("productCode 101文字 → エラー（max超過）", () => {
    const result = checkoutSchema.safeParse({ productCode: "x".repeat(101), mode: "first" });
    expect(result.success).toBe(false);
  });

  // 型違い — 数値を文字列フィールドに渡す
  it("productCode に数値を渡す → エラー", () => {
    const result = checkoutSchema.safeParse({ productCode: 12345, mode: "current" });
    expect(result.success).toBe(false);
  });

  // mode に不正な型を渡す
  it("mode に数値を渡す → エラー", () => {
    const result = checkoutSchema.safeParse({ productCode: "PROD-1", mode: 999 });
    expect(result.success).toBe(false);
  });

  it("mode にブール値を渡す → エラー", () => {
    const result = checkoutSchema.safeParse({ productCode: "PROD-1", mode: true });
    expect(result.success).toBe(false);
  });

  // patientId に数値を渡す
  it("patientId に数値を渡す → エラー", () => {
    const result = checkoutSchema.safeParse({ productCode: "PROD-1", patientId: 123 });
    expect(result.success).toBe(false);
  });

  // reorderId に null → 成功（nullable）
  it("reorderId に null → 成功", () => {
    const result = checkoutSchema.safeParse({ productCode: "PROD-1", reorderId: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reorderId).toBeNull();
    }
  });

  // 全フィールド欠損
  it("空オブジェクト → エラー", () => {
    const result = checkoutSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  // passthrough — 追加プロパティが保持される
  it("passthrough — 追加プロパティが保持される", () => {
    const result = checkoutSchema.safeParse({
      productCode: "PROD-1",
      mode: "current",
      extraField: "extra",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extraField).toBe("extra");
    }
  });

  // productCode 1文字（最小有効値）
  it("productCode 1文字 → 成功（min(1)を満たす）", () => {
    const result = checkoutSchema.safeParse({ productCode: "A" });
    expect(result.success).toBe(true);
  });
});

// ========== registerCompleteSchema — 境界値 ==========
describe("registerCompleteSchema — 境界値テスト", () => {
  // 空文字列の検証
  it("phone 空文字 → エラー", () => {
    const result = registerCompleteSchema.safeParse({ phone: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("電話番号は必須です");
    }
  });

  // 正常値
  it("phone 正常値 → 成功", () => {
    const result = registerCompleteSchema.safeParse({ phone: "09012345678" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("09012345678");
    }
  });

  // 型違い — 数値を文字列フィールドに渡す
  it("phone に数値を渡す → エラー", () => {
    const result = registerCompleteSchema.safeParse({ phone: 9012345678 });
    expect(result.success).toBe(false);
  });

  // フィールド欠損
  it("phone フィールド欠損 → エラー", () => {
    const result = registerCompleteSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  // 1文字（最小有効値）
  it("phone 1文字 → 成功（min(1)を満たす）", () => {
    const result = registerCompleteSchema.safeParse({ phone: "0" });
    expect(result.success).toBe(true);
  });

  // passthrough — 追加プロパティが保持される
  it("passthrough — 追加プロパティが保持される", () => {
    const result = registerCompleteSchema.safeParse({ phone: "09012345678", name: "テスト" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("テスト");
    }
  });
});

// ========== doctorUpdateSchema — 境界値 ==========
describe("doctorUpdateSchema — 境界値テスト", () => {
  // 空文字列の検証
  it("reserveId 空文字 → エラー", () => {
    const result = doctorUpdateSchema.safeParse({ reserveId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("予約IDは必須です");
    }
  });

  // 型違い — 数値を文字列フィールドに渡す
  it("reserveId に数値を渡す → エラー", () => {
    const result = doctorUpdateSchema.safeParse({ reserveId: 123 });
    expect(result.success).toBe(false);
  });

  // フィールド欠損
  it("reserveId フィールド欠損 → エラー", () => {
    const result = doctorUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  // 1文字（最小有効値）
  it("reserveId 1文字 → 成功", () => {
    const result = doctorUpdateSchema.safeParse({ reserveId: "a" });
    expect(result.success).toBe(true);
  });

  // オプショナルフィールドに不正な型
  it("status に数値を渡す → エラー", () => {
    const result = doctorUpdateSchema.safeParse({ reserveId: "r-1", status: 123 });
    expect(result.success).toBe(false);
  });

  it("note に数値を渡す → エラー", () => {
    const result = doctorUpdateSchema.safeParse({ reserveId: "r-1", note: 999 });
    expect(result.success).toBe(false);
  });

  it("prescriptionMenu にブール値を渡す → エラー", () => {
    const result = doctorUpdateSchema.safeParse({ reserveId: "r-1", prescriptionMenu: true });
    expect(result.success).toBe(false);
  });

  // オプショナルフィールド全省略 → 成功
  it("オプショナルフィールド全省略 → 成功", () => {
    const result = doctorUpdateSchema.safeParse({ reserveId: "r-1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
      expect(result.data.note).toBeUndefined();
      expect(result.data.prescriptionMenu).toBeUndefined();
    }
  });
});

// ========== callStatusSchema — 境界値 ==========
describe("callStatusSchema — 境界値テスト", () => {
  it("reserveId 空文字 → エラー", () => {
    const result = callStatusSchema.safeParse({ reserveId: "" });
    expect(result.success).toBe(false);
  });

  it("reserveId に数値を渡す → エラー", () => {
    const result = callStatusSchema.safeParse({ reserveId: 0 });
    expect(result.success).toBe(false);
  });

  it("callStatus 省略時 → デフォルト空文字", () => {
    const result = callStatusSchema.safeParse({ reserveId: "r-1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callStatus).toBe("");
    }
  });

  it("callStatus に数値を渡す → エラー", () => {
    const result = callStatusSchema.safeParse({ reserveId: "r-1", callStatus: 123 });
    expect(result.success).toBe(false);
  });
});

// ========== doctorReorderApproveSchema — 境界値 ==========
describe("doctorReorderApproveSchema — 境界値テスト", () => {
  // 数値の境界値
  it("id = 0 → 成功（0は有効な数値）", () => {
    const result = doctorReorderApproveSchema.safeParse({ id: 0 });
    expect(result.success).toBe(true);
  });

  it("id = -1 → 成功（負数も型としては有効）", () => {
    const result = doctorReorderApproveSchema.safeParse({ id: -1 });
    expect(result.success).toBe(true);
  });

  it("id = Number.MAX_SAFE_INTEGER → 成功", () => {
    const result = doctorReorderApproveSchema.safeParse({ id: Number.MAX_SAFE_INTEGER });
    expect(result.success).toBe(true);
  });

  // 空文字列 → refineでブロック
  it("id 空文字 → エラー（refine）", () => {
    const result = doctorReorderApproveSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("idは必須です");
    }
  });

  // 型違い — ブール値
  it("id にブール値を渡す → エラー", () => {
    const result = doctorReorderApproveSchema.safeParse({ id: true });
    expect(result.success).toBe(false);
  });

  // 型違い — オブジェクト
  it("id にオブジェクトを渡す → エラー", () => {
    const result = doctorReorderApproveSchema.safeParse({ id: { value: 1 } });
    expect(result.success).toBe(false);
  });

  // フィールド欠損
  it("空オブジェクト → エラー", () => {
    const result = doctorReorderApproveSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ========== sendCallFormSchema — 境界値 ==========
describe("sendCallFormSchema — 境界値テスト", () => {
  it("patientId 空文字 → エラー", () => {
    const result = sendCallFormSchema.safeParse({ patientId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("patientIdは必須です");
    }
  });

  it("patientId に数値を渡す → エラー", () => {
    const result = sendCallFormSchema.safeParse({ patientId: 123 });
    expect(result.success).toBe(false);
  });

  it("patientId フィールド欠損 → エラー", () => {
    const result = sendCallFormSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("reserveId に数値を渡す → エラー", () => {
    const result = sendCallFormSchema.safeParse({ patientId: "p-1", reserveId: 123 });
    expect(result.success).toBe(false);
  });
});

// ========== doctorReorderRejectSchema — 境界値 ==========
describe("doctorReorderRejectSchema — 境界値テスト", () => {
  it("id = 0 → 成功", () => {
    const result = doctorReorderRejectSchema.safeParse({ id: 0 });
    expect(result.success).toBe(true);
  });

  it("id = -1 → 成功", () => {
    const result = doctorReorderRejectSchema.safeParse({ id: -1 });
    expect(result.success).toBe(true);
  });

  it("id = Number.MAX_SAFE_INTEGER → 成功", () => {
    const result = doctorReorderRejectSchema.safeParse({ id: Number.MAX_SAFE_INTEGER });
    expect(result.success).toBe(true);
  });

  it("id 空文字 → エラー", () => {
    const result = doctorReorderRejectSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });

  it("id にブール値を渡す → エラー", () => {
    const result = doctorReorderRejectSchema.safeParse({ id: false });
    expect(result.success).toBe(false);
  });

  it("id に null を渡す → エラー", () => {
    const result = doctorReorderRejectSchema.safeParse({ id: null });
    expect(result.success).toBe(false);
  });

  it("id に配列を渡す → エラー", () => {
    const result = doctorReorderRejectSchema.safeParse({ id: [1, 2, 3] });
    expect(result.success).toBe(false);
  });
});
