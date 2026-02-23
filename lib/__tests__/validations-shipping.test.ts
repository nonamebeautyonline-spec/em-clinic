// lib/__tests__/validations-shipping.test.ts
// 発送関連Zodバリデーションスキーマのテスト
import { describe, it, expect } from "vitest";
import {
  shippingConfigSchema,
  exportYamatoB2Schema,
  exportYamatoB2CustomSchema,
  lstepTagCsvSchema,
  shippingShareSchema,
  updateTrackingCsvSchema,
  updateTrackingConfirmSchema,
  addToShippingSchema,
  recreateLabelSchema,
  nonameMasterUpdateTrackingSchema,
} from "@/lib/validations/shipping";

// ---------- shippingConfigSchema ----------
describe("shippingConfigSchema", () => {
  it("正常値でparse成功", () => {
    const result = shippingConfigSchema.safeParse({
      yamato_customer_code: "1234567890",
      yamato_password: "password",
      default_sender_name: "テストクリニック",
      default_sender_phone: "0312345678",
      default_sender_postal_code: "100-0001",
      default_sender_address: "東京都千代田区1-1-1",
    });
    expect(result.success).toBe(true);
  });

  it("全フィールド省略でもparse成功（全てoptional）", () => {
    const result = shippingConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = shippingConfigSchema.safeParse({ extra_field: "value" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extra_field).toBe("value");
    }
  });
});

// ---------- exportYamatoB2Schema ----------
describe("exportYamatoB2Schema", () => {
  it("正常値でparse成功", () => {
    const result = exportYamatoB2Schema.safeParse({
      order_ids: ["order-1", "order-2"],
    });
    expect(result.success).toBe(true);
  });

  it("order_idsが空配列でparse失敗", () => {
    const result = exportYamatoB2Schema.safeParse({ order_ids: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("order_idsは1件以上必要です");
    }
  });

  it("order_ids欠損でparse失敗", () => {
    const result = exportYamatoB2Schema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------- exportYamatoB2CustomSchema ----------
describe("exportYamatoB2CustomSchema", () => {
  const validItem = {
    payment_id: "pay-1",
    name: "山田太郎",
    postal: "100-0001",
    address: "東京都千代田区1-1-1",
    email: "test@example.com",
    phone: "09012345678",
  };

  it("正常値でparse成功", () => {
    const result = exportYamatoB2CustomSchema.safeParse({
      items: [validItem],
    });
    expect(result.success).toBe(true);
  });

  it("all_payment_idsを含めてparse成功", () => {
    const result = exportYamatoB2CustomSchema.safeParse({
      items: [validItem],
      all_payment_ids: ["pay-1", "pay-2"],
    });
    expect(result.success).toBe(true);
  });

  it("itemsが空配列でparse失敗", () => {
    const result = exportYamatoB2CustomSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("itemsは1件以上必要です");
    }
  });

  it("items内の必須フィールド欠損でparse失敗", () => {
    const result = exportYamatoB2CustomSchema.safeParse({
      items: [{ payment_id: "pay-1" }],
    });
    expect(result.success).toBe(false);
  });

  it("items内のオブジェクトもpassthroughで追加フィールド保持", () => {
    const result = exportYamatoB2CustomSchema.safeParse({
      items: [{ ...validItem, extra: "value" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data.items[0] as Record<string, unknown>).extra).toBe("value");
    }
  });
});

// ---------- lstepTagCsvSchema ----------
describe("lstepTagCsvSchema", () => {
  it("正常値でparse成功", () => {
    const result = lstepTagCsvSchema.safeParse({
      lstepIds: ["id-1", "id-2"],
    });
    expect(result.success).toBe(true);
  });

  it("lstepIdsが空配列でparse失敗", () => {
    const result = lstepTagCsvSchema.safeParse({ lstepIds: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("LステップIDリストは1件以上必要です");
    }
  });

  it("lstepIds欠損でparse失敗", () => {
    const result = lstepTagCsvSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------- shippingShareSchema ----------
describe("shippingShareSchema", () => {
  it("正常値でparse成功", () => {
    const result = shippingShareSchema.safeParse({
      data: [{ id: 1, name: "テスト" }],
    });
    expect(result.success).toBe(true);
  });

  it("dataが空配列でparse失敗", () => {
    const result = shippingShareSchema.safeParse({ data: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("共有データは1件以上必要です");
    }
  });

  it("data欠損でparse失敗", () => {
    const result = shippingShareSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------- updateTrackingCsvSchema ----------
describe("updateTrackingCsvSchema", () => {
  it("正常値でparse成功", () => {
    const result = updateTrackingCsvSchema.safeParse({
      csvContent: "payment_id,tracking\npay-1,1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("csvContentが空文字でparse失敗", () => {
    const result = updateTrackingCsvSchema.safeParse({ csvContent: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("CSVデータは必須です");
    }
  });

  it("csvContent欠損でparse失敗", () => {
    const result = updateTrackingCsvSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------- updateTrackingConfirmSchema ----------
describe("updateTrackingConfirmSchema", () => {
  const validEntry = {
    payment_id: "pay-1",
    patient_name: "山田太郎",
    tracking_number: "1234567890",
    matched: true,
  };

  it("正常値でparse成功", () => {
    const result = updateTrackingConfirmSchema.safeParse({
      entries: [validEntry],
    });
    expect(result.success).toBe(true);
  });

  it("entriesが空配列でparse失敗", () => {
    const result = updateTrackingConfirmSchema.safeParse({ entries: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("更新データは1件以上必要です");
    }
  });

  it("entries内の必須フィールド欠損でparse失敗", () => {
    const result = updateTrackingConfirmSchema.safeParse({
      entries: [{ payment_id: "pay-1" }],
    });
    expect(result.success).toBe(false);
  });

  it("matchedがboolean以外でparse失敗", () => {
    const result = updateTrackingConfirmSchema.safeParse({
      entries: [{ ...validEntry, matched: "yes" }],
    });
    expect(result.success).toBe(false);
  });

  it("entries内のオブジェクトもpassthroughで追加フィールド保持", () => {
    const result = updateTrackingConfirmSchema.safeParse({
      entries: [{ ...validEntry, note: "メモ" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data.entries[0] as Record<string, unknown>).note).toBe("メモ");
    }
  });
});

// ---------- addToShippingSchema ----------
describe("addToShippingSchema", () => {
  it("正常値でparse成功", () => {
    const result = addToShippingSchema.safeParse({
      order_id: "order-123",
    });
    expect(result.success).toBe(true);
  });

  it("order_idが空文字でparse失敗", () => {
    const result = addToShippingSchema.safeParse({ order_id: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("order_idは必須です");
    }
  });

  it("order_id欠損でparse失敗", () => {
    const result = addToShippingSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------- recreateLabelSchema ----------
describe("recreateLabelSchema", () => {
  it("正常値でparse成功", () => {
    const result = recreateLabelSchema.safeParse({
      order_id: "order-123",
    });
    expect(result.success).toBe(true);
  });

  it("order_idが空文字でparse失敗", () => {
    const result = recreateLabelSchema.safeParse({ order_id: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("order_idは必須です");
    }
  });

  it("order_id欠損でparse失敗", () => {
    const result = recreateLabelSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------- nonameMasterUpdateTrackingSchema ----------
describe("nonameMasterUpdateTrackingSchema", () => {
  it("正常値でparse成功（必須フィールドのみ）", () => {
    const result = nonameMasterUpdateTrackingSchema.safeParse({
      order_id: "order-123",
      tracking_number: "1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("正常値でparse成功（全フィールド指定）", () => {
    const result = nonameMasterUpdateTrackingSchema.safeParse({
      order_id: "order-123",
      tracking_number: "1234567890",
      update_only: true,
      shipping_date: "2026-02-23",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.update_only).toBe(true);
      expect(result.data.shipping_date).toBe("2026-02-23");
    }
  });

  it("order_idが空文字でparse失敗", () => {
    const result = nonameMasterUpdateTrackingSchema.safeParse({
      order_id: "",
      tracking_number: "1234567890",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("order_idは必須です");
    }
  });

  it("tracking_numberが空文字でparse失敗", () => {
    const result = nonameMasterUpdateTrackingSchema.safeParse({
      order_id: "order-123",
      tracking_number: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("tracking_numberは必須です");
    }
  });

  it("必須フィールド欠損でparse失敗", () => {
    const result = nonameMasterUpdateTrackingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = nonameMasterUpdateTrackingSchema.safeParse({
      order_id: "order-123",
      tracking_number: "1234567890",
      memo: "テストメモ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.memo).toBe("テストメモ");
    }
  });
});
