// lib/__tests__/custom-field-types.test.ts
// カスタムフィールド型定義・バリデーションのテスト
import { describe, it, expect } from "vitest";
import {
  extractMetadata,
  getChoices,
  validateFieldValue,
  isValidFieldType,
  FIELD_TYPES,
} from "@/lib/custom-field-types";

describe("extractMetadata", () => {
  it("nullの場合は空オブジェクトを返す", () => {
    expect(extractMetadata(null)).toEqual({});
  });

  it("undefinedの場合は空オブジェクトを返す", () => {
    expect(extractMetadata(undefined)).toEqual({});
  });

  it("旧形式（string[]）をchoicesに変換する", () => {
    const result = extractMetadata(["A", "B", "C"]);
    expect(result).toEqual({ choices: ["A", "B", "C"] });
  });

  it("新形式（FieldMetadata）をそのまま返す", () => {
    const meta = { choices: ["X"], min: 0, max: 100, placeholder: "入力" };
    expect(extractMetadata(meta)).toEqual(meta);
  });
});

describe("getChoices", () => {
  it("string[]からchoicesを取得する", () => {
    expect(getChoices(["A", "B"])).toEqual(["A", "B"]);
  });

  it("FieldMetadataからchoicesを取得する", () => {
    expect(getChoices({ choices: ["X", "Y"] })).toEqual(["X", "Y"]);
  });

  it("nullの場合は空配列を返す", () => {
    expect(getChoices(null)).toEqual([]);
  });

  it("choicesがないFieldMetadataでは空配列を返す", () => {
    expect(getChoices({ min: 0 })).toEqual([]);
  });
});

describe("validateFieldValue", () => {
  // === 空値 ===
  it("空文字列は全型でvalidを返す", () => {
    for (const type of FIELD_TYPES) {
      expect(validateFieldValue(type, "").valid).toBe(true);
    }
  });

  // === text ===
  it("textは任意の文字列でvalid", () => {
    expect(validateFieldValue("text", "何でもOK").valid).toBe(true);
  });

  // === number ===
  it("numberで数値文字列はvalid", () => {
    expect(validateFieldValue("number", "42").valid).toBe(true);
  });

  it("numberで非数値文字列はinvalid", () => {
    const r = validateFieldValue("number", "abc");
    expect(r.valid).toBe(false);
    expect(r.error).toContain("数値");
  });

  it("numberでmin制約に違反するとinvalid", () => {
    const r = validateFieldValue("number", "-1", { min: 0 });
    expect(r.valid).toBe(false);
    expect(r.error).toContain("0以上");
  });

  it("numberでmax制約に違反するとinvalid", () => {
    const r = validateFieldValue("number", "101", { max: 100 });
    expect(r.valid).toBe(false);
    expect(r.error).toContain("100以下");
  });

  it("numberでmin-max範囲内はvalid", () => {
    expect(validateFieldValue("number", "50", { min: 0, max: 100 }).valid).toBe(true);
  });

  // === date ===
  it("dateで正しいYYYY-MM-DD形式はvalid", () => {
    expect(validateFieldValue("date", "2024-01-15").valid).toBe(true);
  });

  it("dateで不正な形式はinvalid", () => {
    expect(validateFieldValue("date", "2024/01/15").valid).toBe(false);
  });

  it("dateで不正な日付はinvalid", () => {
    expect(validateFieldValue("date", "9999-99-99").valid).toBe(false);
  });

  // === select ===
  it("selectで定義内の値はvalid", () => {
    expect(validateFieldValue("select", "A", ["A", "B"]).valid).toBe(true);
  });

  it("selectで定義外の値はinvalid", () => {
    const r = validateFieldValue("select", "C", ["A", "B"]);
    expect(r.valid).toBe(false);
    expect(r.error).toContain("選択肢");
  });

  it("selectで選択肢が空の場合は任意の値でvalid", () => {
    expect(validateFieldValue("select", "anything", []).valid).toBe(true);
  });

  // === boolean ===
  it("booleanで'true'/'false'はvalid", () => {
    expect(validateFieldValue("boolean", "true").valid).toBe(true);
    expect(validateFieldValue("boolean", "false").valid).toBe(true);
  });

  it("booleanでそれ以外はinvalid", () => {
    expect(validateFieldValue("boolean", "yes").valid).toBe(false);
  });

  // === url ===
  it("urlで有効なURLはvalid", () => {
    expect(validateFieldValue("url", "https://example.com").valid).toBe(true);
  });

  it("urlで無効な文字列はinvalid", () => {
    expect(validateFieldValue("url", "not-a-url").valid).toBe(false);
  });
});

describe("isValidFieldType", () => {
  it("定義済みの型はtrueを返す", () => {
    for (const t of FIELD_TYPES) {
      expect(isValidFieldType(t)).toBe(true);
    }
  });

  it("未定義の型はfalseを返す", () => {
    expect(isValidFieldType("unknown")).toBe(false);
    expect(isValidFieldType("")).toBe(false);
  });
});
