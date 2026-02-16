// lib/__tests__/patient-utils.test.ts
// 患者関連ユーティリティ関数のテスト
import { describe, it, expect } from "vitest";
import {
  formatProductCode,
  formatPaymentMethod,
  formatReorderStatus,
  formatDateJST,
  formatBirthWithEra,
  calcAge,
} from "@/lib/patient-utils";

// === formatProductCode ===
describe("formatProductCode", () => {
  it("MJL_5mg_1m → マンジャロ 5mg 1ヶ月", () => {
    expect(formatProductCode("MJL_5mg_1m")).toBe("マンジャロ 5mg 1ヶ月");
  });

  it("MJL_2.5mg_3m → マンジャロ 2.5mg 3ヶ月", () => {
    expect(formatProductCode("MJL_2.5mg_3m")).toBe("マンジャロ 2.5mg 3ヶ月");
  });

  it("null → '-'", () => {
    expect(formatProductCode(null)).toBe("-");
  });

  it("空文字 → '-'", () => {
    expect(formatProductCode("")).toBe("-");
  });
});

// === formatPaymentMethod ===
describe("formatPaymentMethod", () => {
  it("credit_card → カード", () => {
    expect(formatPaymentMethod("credit_card")).toBe("カード");
  });

  it("card → カード", () => {
    expect(formatPaymentMethod("card")).toBe("カード");
  });

  it("CARD → カード", () => {
    expect(formatPaymentMethod("CARD")).toBe("カード");
  });

  it("bank_transfer → 銀行振込", () => {
    expect(formatPaymentMethod("bank_transfer")).toBe("銀行振込");
  });

  it("bank → 銀行振込", () => {
    expect(formatPaymentMethod("bank")).toBe("銀行振込");
  });

  it("BANK_TRANSFER → 銀行振込", () => {
    expect(formatPaymentMethod("BANK_TRANSFER")).toBe("銀行振込");
  });

  it("null → '-'", () => {
    expect(formatPaymentMethod(null)).toBe("-");
  });

  it("未知のメソッドはそのまま返す", () => {
    expect(formatPaymentMethod("crypto")).toBe("crypto");
  });
});

// === formatReorderStatus ===
describe("formatReorderStatus", () => {
  it("pending → 承認待ち", () => {
    expect(formatReorderStatus("pending")).toBe("承認待ち");
  });

  it("confirmed → 承認済み", () => {
    expect(formatReorderStatus("confirmed")).toBe("承認済み");
  });

  it("paid → 決済済み", () => {
    expect(formatReorderStatus("paid")).toBe("決済済み");
  });

  it("rejected → 却下", () => {
    expect(formatReorderStatus("rejected")).toBe("却下");
  });

  it("canceled → キャンセル", () => {
    expect(formatReorderStatus("canceled")).toBe("キャンセル");
  });

  it("null → '-'", () => {
    expect(formatReorderStatus(null)).toBe("-");
  });

  it("未知のステータスはそのまま返す", () => {
    expect(formatReorderStatus("unknown")).toBe("unknown");
  });
});

// === formatDateJST ===
describe("formatDateJST", () => {
  it("ISO文字列をJSTに変換", () => {
    // 2026-01-15T00:00:00Z (UTC) → JST 09:00
    const result = formatDateJST("2026-01-15T00:00:00Z");
    expect(result).toBe("01/15 09:00");
  });

  it("null → '-'", () => {
    expect(formatDateJST(null)).toBe("-");
  });

  it("空文字 → '-'", () => {
    expect(formatDateJST("")).toBe("-");
  });
});

// === formatBirthWithEra ===
describe("formatBirthWithEra", () => {
  it("令和生まれ（2020年）", () => {
    const result = formatBirthWithEra("2020-03-15");
    expect(result).toContain("令和2年");
    expect(result).toContain("2020/03/15");
  });

  it("平成生まれ（1995年）", () => {
    const result = formatBirthWithEra("1995-06-20");
    expect(result).toContain("平成7年");
    expect(result).toContain("1995/06/20");
  });

  it("昭和生まれ（1970年）", () => {
    const result = formatBirthWithEra("1970-12-01");
    expect(result).toContain("昭和45年");
    expect(result).toContain("1970/12/01");
  });

  it("大正生まれ（1920年）", () => {
    const result = formatBirthWithEra("1920-01-01");
    expect(result).toContain("大正9年");
  });

  it("大正以前（1910年）は西暦のみ", () => {
    const result = formatBirthWithEra("1910-05-05");
    expect(result).toBe("1910/05/05");
  });

  it("null → '-'", () => {
    expect(formatBirthWithEra(null)).toBe("-");
  });

  it("不正な日付文字列はそのまま返す", () => {
    expect(formatBirthWithEra("invalid")).toBe("invalid");
  });

  it("令和元年（2019年）", () => {
    const result = formatBirthWithEra("2019-05-01");
    expect(result).toContain("令和1年");
  });

  it("平成元年（1989年）", () => {
    const result = formatBirthWithEra("1989-01-08");
    expect(result).toContain("平成1年");
  });

  it("昭和元年（1926年）", () => {
    const result = formatBirthWithEra("1926-12-25");
    expect(result).toContain("昭和1年");
  });
});

// === calcAge ===
describe("calcAge", () => {
  it("null → null", () => {
    expect(calcAge(null)).toBeNull();
  });

  it("空文字 → null", () => {
    expect(calcAge("")).toBeNull();
  });

  it("不正な日付 → null", () => {
    expect(calcAge("invalid")).toBeNull();
  });

  it("過去の日付から年齢を計算", () => {
    // 30年前の日付
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
    thirtyYearsAgo.setMonth(0, 1); // 1月1日（確実に誕生日を過ぎている）
    const age = calcAge(thirtyYearsAgo.toISOString());
    expect(age).toBe(30);
  });

  it("未来の日付 → null（負の年齢）", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 10);
    expect(calcAge(futureDate.toISOString())).toBeNull();
  });
});
