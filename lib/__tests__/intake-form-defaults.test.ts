// lib/__tests__/intake-form-defaults.test.ts — 問診フォームデフォルト値テスト

import {
  DEFAULT_INTAKE_FIELDS,
  DEFAULT_INTAKE_SETTINGS,
  type IntakeFormField,
} from "@/lib/intake-form-defaults";

describe("DEFAULT_INTAKE_FIELDS", () => {
  it("10個のフィールドが定義されている", () => {
    expect(DEFAULT_INTAKE_FIELDS).toHaveLength(10);
  });

  it("各フィールドに必須プロパティ（id, type, label, required, sort_order）が存在する", () => {
    for (const field of DEFAULT_INTAKE_FIELDS) {
      expect(field).toHaveProperty("id");
      expect(field).toHaveProperty("type");
      expect(field).toHaveProperty("label");
      expect(field).toHaveProperty("required");
      expect(field).toHaveProperty("sort_order");
      expect(typeof field.id).toBe("string");
      expect(typeof field.label).toBe("string");
      expect(typeof field.required).toBe("boolean");
      expect(typeof field.sort_order).toBe("number");
    }
  });

  it("sort_order が一意で 0 から連番", () => {
    const sortOrders = DEFAULT_INTAKE_FIELDS.map((f) => f.sort_order);
    // 一意性
    expect(new Set(sortOrders).size).toBe(sortOrders.length);
    // 0 から連番
    for (let i = 0; i < sortOrders.length; i++) {
      expect(sortOrders).toContain(i);
    }
  });

  it("id が全フィールドで一意", () => {
    const ids = DEFAULT_INTAKE_FIELDS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("type が有効な値のみ", () => {
    const validTypes = ["text", "textarea", "radio", "dropdown", "checkbox", "heading"];
    for (const field of DEFAULT_INTAKE_FIELDS) {
      expect(validTypes).toContain(field.type);
    }
  });

  it("radio/dropdown フィールドには options が設定されている", () => {
    const fieldsWithOptions = DEFAULT_INTAKE_FIELDS.filter(
      (f) => f.type === "radio" || f.type === "dropdown",
    );
    for (const field of fieldsWithOptions) {
      expect(field.options).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(0);
      for (const opt of field.options!) {
        expect(opt).toHaveProperty("label");
        expect(opt).toHaveProperty("value");
      }
    }
  });

  it("conditional.when が有効なフィールドIDを参照している", () => {
    const validIds = new Set(DEFAULT_INTAKE_FIELDS.map((f) => f.id));
    const conditionalFields = DEFAULT_INTAKE_FIELDS.filter((f) => f.conditional);
    expect(conditionalFields.length).toBeGreaterThan(0);
    for (const field of conditionalFields) {
      expect(validIds.has(field.conditional!.when)).toBe(true);
    }
  });

  it("ng_block フィールドには ng_block_value が設定されている", () => {
    const ngFields = DEFAULT_INTAKE_FIELDS.filter((f) => f.ng_block);
    expect(ngFields.length).toBeGreaterThan(0);
    for (const field of ngFields) {
      expect(field.ng_block_value).toBeDefined();
      expect(typeof field.ng_block_value).toBe("string");
    }
  });

  it("先頭フィールドは ng_check（NG判定）", () => {
    const first = DEFAULT_INTAKE_FIELDS.find((f) => f.sort_order === 0);
    expect(first?.id).toBe("ng_check");
    expect(first?.ng_block).toBe(true);
  });
});

describe("DEFAULT_INTAKE_SETTINGS", () => {
  it("必須プロパティが設定されている", () => {
    expect(DEFAULT_INTAKE_SETTINGS).toHaveProperty("step_by_step");
    expect(DEFAULT_INTAKE_SETTINGS).toHaveProperty("header_title");
    expect(typeof DEFAULT_INTAKE_SETTINGS.step_by_step).toBe("boolean");
    expect(typeof DEFAULT_INTAKE_SETTINGS.header_title).toBe("string");
  });

  it("step_by_step が true", () => {
    expect(DEFAULT_INTAKE_SETTINGS.step_by_step).toBe(true);
  });

  it("header_title が「問診」", () => {
    expect(DEFAULT_INTAKE_SETTINGS.header_title).toBe("問診");
  });

  it("estimated_time が設定されている", () => {
    expect(DEFAULT_INTAKE_SETTINGS.estimated_time).toBeDefined();
    expect(typeof DEFAULT_INTAKE_SETTINGS.estimated_time).toBe("string");
  });

  it("ng_block_title と ng_block_message が設定されている", () => {
    expect(DEFAULT_INTAKE_SETTINGS.ng_block_title).toBeDefined();
    expect(DEFAULT_INTAKE_SETTINGS.ng_block_message).toBeDefined();
  });
});
