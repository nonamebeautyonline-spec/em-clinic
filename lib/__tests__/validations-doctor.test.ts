// lib/__tests__/validations-doctor.test.ts
// 医師関連Zodバリデーションスキーマのテスト
import { describe, it, expect } from "vitest";
import {
  doctorUpdateSchema,
  callStatusSchema,
  doctorReorderApproveSchema,
  sendCallFormSchema,
  doctorReorderRejectSchema,
} from "@/lib/validations/doctor";

// ---------- doctorUpdateSchema ----------
describe("doctorUpdateSchema", () => {
  it("正常値でparse成功（必須フィールドのみ）", () => {
    const result = doctorUpdateSchema.safeParse({
      reserveId: "reserve-123",
    });
    expect(result.success).toBe(true);
  });

  it("正常値でparse成功（全フィールド指定）", () => {
    const result = doctorUpdateSchema.safeParse({
      reserveId: "reserve-123",
      status: "completed",
      note: "異常なし",
      prescriptionMenu: "GLP-1 リベルサス 3mg",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("completed");
    }
  });

  it("reserveIdが空文字でparse失敗", () => {
    const result = doctorUpdateSchema.safeParse({ reserveId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("予約IDは必須です");
    }
  });

  it("reserveId欠損でparse失敗", () => {
    const result = doctorUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = doctorUpdateSchema.safeParse({
      reserveId: "reserve-123",
      extra: "value",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extra).toBe("value");
    }
  });
});

// ---------- callStatusSchema ----------
describe("callStatusSchema", () => {
  it("正常値でparse成功", () => {
    const result = callStatusSchema.safeParse({
      reserveId: "reserve-123",
      callStatus: "completed",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callStatus).toBe("completed");
    }
  });

  it("callStatus省略時にデフォルト空文字が設定される", () => {
    const result = callStatusSchema.safeParse({
      reserveId: "reserve-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callStatus).toBe("");
    }
  });

  it("reserveIdが空文字でparse失敗", () => {
    const result = callStatusSchema.safeParse({ reserveId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("reserveIdは必須です");
    }
  });

  it("reserveId欠損でparse失敗", () => {
    const result = callStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = callStatusSchema.safeParse({
      reserveId: "reserve-123",
      extra: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extra).toBe(true);
    }
  });
});

// ---------- doctorReorderApproveSchema ----------
describe("doctorReorderApproveSchema", () => {
  it("文字列idでparse成功", () => {
    const result = doctorReorderApproveSchema.safeParse({ id: "123" });
    expect(result.success).toBe(true);
  });

  it("数値idでparse成功", () => {
    const result = doctorReorderApproveSchema.safeParse({ id: 123 });
    expect(result.success).toBe(true);
  });

  it("idが空文字でparse失敗（refineチェック）", () => {
    const result = doctorReorderApproveSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("idは必須です");
    }
  });

  it("id欠損でparse失敗", () => {
    const result = doctorReorderApproveSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("idが0でparse成功（0は有効な数値）", () => {
    const result = doctorReorderApproveSchema.safeParse({ id: 0 });
    expect(result.success).toBe(true);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = doctorReorderApproveSchema.safeParse({
      id: "123",
      note: "承認メモ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBe("承認メモ");
    }
  });
});

// ---------- sendCallFormSchema ----------
describe("sendCallFormSchema", () => {
  it("正常値でparse成功（必須フィールドのみ）", () => {
    const result = sendCallFormSchema.safeParse({
      patientId: "patient-123",
    });
    expect(result.success).toBe(true);
  });

  it("正常値でparse成功（全フィールド指定）", () => {
    const result = sendCallFormSchema.safeParse({
      patientId: "patient-123",
      reserveId: "reserve-456",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reserveId).toBe("reserve-456");
    }
  });

  it("patientIdが空文字でparse失敗", () => {
    const result = sendCallFormSchema.safeParse({ patientId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("patientIdは必須です");
    }
  });

  it("patientId欠損でparse失敗", () => {
    const result = sendCallFormSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = sendCallFormSchema.safeParse({
      patientId: "patient-123",
      extra: "value",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extra).toBe("value");
    }
  });
});

// ---------- doctorReorderRejectSchema ----------
describe("doctorReorderRejectSchema", () => {
  it("文字列idでparse成功", () => {
    const result = doctorReorderRejectSchema.safeParse({ id: "456" });
    expect(result.success).toBe(true);
  });

  it("数値idでparse成功", () => {
    const result = doctorReorderRejectSchema.safeParse({ id: 456 });
    expect(result.success).toBe(true);
  });

  it("idが空文字でparse失敗（refineチェック）", () => {
    const result = doctorReorderRejectSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("idは必須です");
    }
  });

  it("id欠損でparse失敗", () => {
    const result = doctorReorderRejectSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = doctorReorderRejectSchema.safeParse({
      id: "456",
      reason: "却下理由",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("却下理由");
    }
  });
});
