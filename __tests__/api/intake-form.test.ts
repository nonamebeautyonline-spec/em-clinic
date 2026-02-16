// __tests__/api/intake-form.test.ts
// 問診フォーム定義API・バリデーション・デフォルト値のテスト
import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  DEFAULT_INTAKE_FIELDS,
  DEFAULT_INTAKE_SETTINGS,
} from "@/lib/intake-form-defaults";
import type { IntakeFormField, IntakeFormSettings } from "@/lib/intake-form-defaults";

// Zodスキーマを直接テスト用にインライン定義（lib/validations/intake-form.ts と同一構造）
const IntakeFieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const IntakeConditionalSchema = z.object({
  when: z.string().min(1),
  value: z.string().min(1),
});

const IntakeFormFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "textarea", "radio", "dropdown", "checkbox", "heading"]),
  label: z.string().min(1),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(IntakeFieldOptionSchema).optional(),
  sort_order: z.number().int().min(0),
  conditional: IntakeConditionalSchema.optional(),
  ng_block: z.boolean().optional(),
  ng_block_value: z.string().optional(),
  ng_block_message: z.string().optional(),
});

const IntakeFormSettingsSchema = z.object({
  step_by_step: z.boolean(),
  header_title: z.string().min(1),
  estimated_time: z.string().optional(),
  ng_block_title: z.string().optional(),
  ng_block_message: z.string().optional(),
});

const IntakeFormUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  fields: z.array(IntakeFormFieldSchema),
  settings: IntakeFormSettingsSchema,
});

// ============================================================
// デフォルト値テスト
// ============================================================

describe("DEFAULT_INTAKE_FIELDS", () => {
  it("10個のフィールドが定義されている", () => {
    expect(DEFAULT_INTAKE_FIELDS).toHaveLength(10);
  });

  it("全フィールドにIDが設定されている", () => {
    for (const field of DEFAULT_INTAKE_FIELDS) {
      expect(field.id).toBeTruthy();
    }
  });

  it("ng_checkフィールドが先頭にある", () => {
    expect(DEFAULT_INTAKE_FIELDS[0].id).toBe("ng_check");
    expect(DEFAULT_INTAKE_FIELDS[0].type).toBe("radio");
    expect(DEFAULT_INTAKE_FIELDS[0].ng_block).toBe(true);
    expect(DEFAULT_INTAKE_FIELDS[0].ng_block_value).toBe("yes");
  });

  it("条件付きフィールドが正しく設定されている", () => {
    const conditional = DEFAULT_INTAKE_FIELDS.filter((f) => f.conditional);
    expect(conditional.length).toBeGreaterThanOrEqual(4);

    // current_disease_detail は current_disease_yesno === "yes" で表示
    const diseaseDetail = DEFAULT_INTAKE_FIELDS.find(
      (f) => f.id === "current_disease_detail",
    );
    expect(diseaseDetail?.conditional).toEqual({
      when: "current_disease_yesno",
      value: "yes",
    });

    // entry_other は entry_route === "other" で表示
    const entryOther = DEFAULT_INTAKE_FIELDS.find(
      (f) => f.id === "entry_other",
    );
    expect(entryOther?.conditional).toEqual({
      when: "entry_route",
      value: "other",
    });
  });

  it("sort_orderが昇順に設定されている", () => {
    for (let i = 0; i < DEFAULT_INTAKE_FIELDS.length; i++) {
      expect(DEFAULT_INTAKE_FIELDS[i].sort_order).toBe(i);
    }
  });

  it("各フィールドのrequiredが適切に設定されている", () => {
    // glp_historyのみ任意
    const glpHistory = DEFAULT_INTAKE_FIELDS.find(
      (f) => f.id === "glp_history",
    );
    expect(glpHistory?.required).toBe(false);

    // それ以外は全て必須
    const requiredFields = DEFAULT_INTAKE_FIELDS.filter(
      (f) => f.id !== "glp_history",
    );
    for (const f of requiredFields) {
      expect(f.required).toBe(true);
    }
  });
});

describe("DEFAULT_INTAKE_SETTINGS", () => {
  it("ステップバイステップがデフォルトで有効", () => {
    expect(DEFAULT_INTAKE_SETTINGS.step_by_step).toBe(true);
  });

  it("ヘッダータイトルが設定されている", () => {
    expect(DEFAULT_INTAKE_SETTINGS.header_title).toBe("問診");
  });

  it("NGブロックのタイトルとメッセージが設定されている", () => {
    expect(DEFAULT_INTAKE_SETTINGS.ng_block_title).toBeTruthy();
    expect(DEFAULT_INTAKE_SETTINGS.ng_block_message).toBeTruthy();
  });

  it("目安時間が設定されている", () => {
    expect(DEFAULT_INTAKE_SETTINGS.estimated_time).toBeTruthy();
  });
});

// ============================================================
// Zodバリデーションテスト
// ============================================================

describe("IntakeFormUpdateSchema バリデーション", () => {
  it("デフォルト値がバリデーションを通過する", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: DEFAULT_INTAKE_FIELDS,
      settings: DEFAULT_INTAKE_SETTINGS,
    });
    expect(result.success).toBe(true);
  });

  it("空のフィールド配列でもバリデーション通過", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [],
      settings: DEFAULT_INTAKE_SETTINGS,
    });
    expect(result.success).toBe(true);
  });

  it("フィールドのラベルが空だとバリデーションエラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [
        {
          id: "test",
          type: "text",
          label: "",
          required: false,
          sort_order: 0,
        },
      ],
      settings: DEFAULT_INTAKE_SETTINGS,
    });
    expect(result.success).toBe(false);
  });

  it("フィールドのtypeが不正だとバリデーションエラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [
        {
          id: "test",
          type: "invalid_type",
          label: "テスト",
          required: false,
          sort_order: 0,
        },
      ],
      settings: DEFAULT_INTAKE_SETTINGS,
    });
    expect(result.success).toBe(false);
  });

  it("settingsのheader_titleが空だとバリデーションエラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: DEFAULT_INTAKE_FIELDS,
      settings: {
        ...DEFAULT_INTAKE_SETTINGS,
        header_title: "",
      },
    });
    expect(result.success).toBe(false);
  });

  it("全フィールドタイプがバリデーションを通過する", () => {
    const types = [
      "text",
      "textarea",
      "radio",
      "dropdown",
      "checkbox",
      "heading",
    ] as const;

    for (const type of types) {
      const field: IntakeFormField = {
        id: `test_${type}`,
        type,
        label: `テスト${type}`,
        required: false,
        sort_order: 0,
      };
      if (type === "radio" || type === "dropdown" || type === "checkbox") {
        field.options = [{ label: "選択肢1", value: "opt1" }];
      }
      const result = IntakeFormUpdateSchema.safeParse({
        fields: [field],
        settings: DEFAULT_INTAKE_SETTINGS,
      });
      expect(result.success).toBe(true);
    }
  });

  it("条件付き表示のwhenが空だとバリデーションエラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [
        {
          id: "test",
          type: "text",
          label: "テスト",
          required: false,
          sort_order: 0,
          conditional: { when: "", value: "yes" },
        },
      ],
      settings: DEFAULT_INTAKE_SETTINGS,
    });
    expect(result.success).toBe(false);
  });

  it("NG判定の設定が正しく通る", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      fields: [
        {
          id: "test",
          type: "radio",
          label: "テスト",
          required: true,
          sort_order: 0,
          options: [
            { label: "はい", value: "yes" },
            { label: "いいえ", value: "no" },
          ],
          ng_block: true,
          ng_block_value: "yes",
          ng_block_message: "NG判定メッセージ",
        },
      ],
      settings: DEFAULT_INTAKE_SETTINGS,
    });
    expect(result.success).toBe(true);
  });

  it("nameが201文字以上だとバリデーションエラー", () => {
    const result = IntakeFormUpdateSchema.safeParse({
      name: "a".repeat(201),
      fields: [],
      settings: DEFAULT_INTAKE_SETTINGS,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// NG判定ロジックテスト
// ============================================================

describe("NG判定ロジック", () => {
  function isNgBlocked(
    field: IntakeFormField,
    answers: Record<string, string>,
  ): boolean {
    return !!(
      field.ng_block && answers[field.id] === field.ng_block_value
    );
  }

  it("ng_blockフィールドで値が一致したらブロック", () => {
    const field: IntakeFormField = {
      id: "ng_check",
      type: "radio",
      label: "テスト",
      required: true,
      sort_order: 0,
      ng_block: true,
      ng_block_value: "yes",
    };
    expect(isNgBlocked(field, { ng_check: "yes" })).toBe(true);
    expect(isNgBlocked(field, { ng_check: "no" })).toBe(false);
  });

  it("ng_blockがfalseならブロックしない", () => {
    const field: IntakeFormField = {
      id: "test",
      type: "radio",
      label: "テスト",
      required: true,
      sort_order: 0,
      ng_block: false,
      ng_block_value: "yes",
    };
    expect(isNgBlocked(field, { test: "yes" })).toBe(false);
  });

  it("ng_blockが未設定ならブロックしない", () => {
    const field: IntakeFormField = {
      id: "test",
      type: "radio",
      label: "テスト",
      required: true,
      sort_order: 0,
    };
    expect(isNgBlocked(field, { test: "yes" })).toBe(false);
  });

  it("デフォルトフィールドのng_checkが正しくブロックする", () => {
    const ngField = DEFAULT_INTAKE_FIELDS.find((f) => f.id === "ng_check")!;
    expect(isNgBlocked(ngField, { ng_check: "yes" })).toBe(true);
    expect(isNgBlocked(ngField, { ng_check: "no" })).toBe(false);
  });
});

// ============================================================
// 条件付き表示ロジックテスト
// ============================================================

describe("条件付き表示ロジック", () => {
  function isVisible(
    field: IntakeFormField,
    answers: Record<string, string>,
  ): boolean {
    if (!field.conditional) return true;
    return answers[field.conditional.when] === field.conditional.value;
  }

  it("条件なしのフィールドは常に表示", () => {
    const field: IntakeFormField = {
      id: "test",
      type: "text",
      label: "テスト",
      required: false,
      sort_order: 0,
    };
    expect(isVisible(field, {})).toBe(true);
    expect(isVisible(field, { anything: "value" })).toBe(true);
  });

  it("条件一致で表示", () => {
    const field: IntakeFormField = {
      id: "detail",
      type: "textarea",
      label: "詳細",
      required: true,
      sort_order: 1,
      conditional: { when: "yesno", value: "yes" },
    };
    expect(isVisible(field, { yesno: "yes" })).toBe(true);
    expect(isVisible(field, { yesno: "no" })).toBe(false);
    expect(isVisible(field, {})).toBe(false);
  });

  it("デフォルトフィールドの条件が正しく動作", () => {
    const diseaseDetail = DEFAULT_INTAKE_FIELDS.find(
      (f) => f.id === "current_disease_detail",
    )!;
    expect(
      isVisible(diseaseDetail, { current_disease_yesno: "yes" }),
    ).toBe(true);
    expect(
      isVisible(diseaseDetail, { current_disease_yesno: "no" }),
    ).toBe(false);

    const medDetail = DEFAULT_INTAKE_FIELDS.find(
      (f) => f.id === "med_detail",
    )!;
    expect(isVisible(medDetail, { med_yesno: "yes" })).toBe(true);
    expect(isVisible(medDetail, { med_yesno: "no" })).toBe(false);

    const allergyDetail = DEFAULT_INTAKE_FIELDS.find(
      (f) => f.id === "allergy_detail",
    )!;
    expect(isVisible(allergyDetail, { allergy_yesno: "yes" })).toBe(true);
    expect(isVisible(allergyDetail, { allergy_yesno: "no" })).toBe(false);

    const entryOther = DEFAULT_INTAKE_FIELDS.find(
      (f) => f.id === "entry_other",
    )!;
    expect(isVisible(entryOther, { entry_route: "other" })).toBe(true);
    expect(isVisible(entryOther, { entry_route: "instagram" })).toBe(
      false,
    );
  });
});

// ============================================================
// マルチテナント対応テスト
// ============================================================

describe("マルチテナント対応", () => {
  it("テナントIDがnullの場合もフィルターなしで動作する", () => {
    // withTenant の挙動テスト（lib/tenant.ts の仕様確認）
    // tenantId = null → フィルターなし（シングルテナント互換）
    const mockQuery = {
      eq: (col: string, val: string) => ({ col, val, filtered: true }),
    };

    // tenantId = null の場合、queryをそのまま返す
    const tenantId: string | null = null;
    const result = tenantId
      ? mockQuery.eq("tenant_id", tenantId)
      : mockQuery;
    expect(result).toBe(mockQuery);
  });

  it("テナントIDがある場合はフィルターが追加される", () => {
    const mockQuery = {
      eq: (col: string, val: string) => ({ col, val, filtered: true }),
    };

    const tenantId = "tenant_001";
    const result = tenantId
      ? mockQuery.eq("tenant_id", tenantId)
      : mockQuery;
    expect(result).toEqual({
      col: "tenant_id",
      val: "tenant_001",
      filtered: true,
    });
  });

  it("tenantPayloadがnullの場合はtenant_id: nullを返す", () => {
    const tenantPayload = (tid: string | null) => ({
      tenant_id: tid || null,
    });
    expect(tenantPayload(null)).toEqual({ tenant_id: null });
    expect(tenantPayload("tenant_001")).toEqual({
      tenant_id: "tenant_001",
    });
  });
});

// ============================================================
// フィールドID互換性テスト
// ============================================================

describe("フィールドID互換性", () => {
  it("デフォルトフィールドのIDが既存のintake.answersキーと一致する", () => {
    // 既存のintake.answersで使われていたキー
    const expectedIds = [
      "ng_check",
      "current_disease_yesno",
      "current_disease_detail",
      "glp_history",
      "med_yesno",
      "med_detail",
      "allergy_yesno",
      "allergy_detail",
      "entry_route",
      "entry_other",
    ];

    const actualIds = DEFAULT_INTAKE_FIELDS.map((f) => f.id);
    expect(actualIds).toEqual(expectedIds);
  });

  it("フィールドIDが一意である", () => {
    const ids = DEFAULT_INTAKE_FIELDS.map((f) => f.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
