// lib/__tests__/phone.test.ts
// 電話番号正規化のテスト
import { describe, it, expect } from "vitest";
import { normalizeJPPhone } from "@/lib/phone";

describe("normalizeJPPhone", () => {
  // === 基本動作 ===
  it("空文字を返す（入力が空）", () => {
    expect(normalizeJPPhone("")).toBe("");
  });

  it("空文字を返す（入力がnull相当）", () => {
    expect(normalizeJPPhone(null as unknown as string)).toBe("");
    expect(normalizeJPPhone(undefined as unknown as string)).toBe("");
  });

  it("空白のみの入力は空文字を返す", () => {
    expect(normalizeJPPhone("   ")).toBe("");
  });

  it("数字以外の文字のみは空文字を返す", () => {
    expect(normalizeJPPhone("abc-def")).toBe("");
  });

  // === ハイフン・空白の除去 ===
  it("ハイフン付き番号を正規化", () => {
    expect(normalizeJPPhone("090-1234-5678")).toBe("09012345678");
  });

  it("空白付き番号を正規化", () => {
    expect(normalizeJPPhone("090 1234 5678")).toBe("09012345678");
  });

  it("前後の空白をtrim", () => {
    expect(normalizeJPPhone("  09012345678  ")).toBe("09012345678");
  });

  it("括弧付き番号を正規化", () => {
    expect(normalizeJPPhone("(090)1234-5678")).toBe("09012345678");
  });

  // === 0080/0090/0070 → 080/090/070（余分な0除去）===
  it("0090を090に変換", () => {
    expect(normalizeJPPhone("009012345678")).toBe("09012345678");
  });

  it("0080を080に変換", () => {
    expect(normalizeJPPhone("008012345678")).toBe("08012345678");
  });

  it("0070を070に変換", () => {
    expect(normalizeJPPhone("007012345678")).toBe("07012345678");
  });

  // === 00汎用プレフィックス ===
  it("00プレフィックスの先頭0を1つだけ除去（固定電話）", () => {
    expect(normalizeJPPhone("00312345678")).toBe("0312345678");
  });

  it("0043→043（固定番号）", () => {
    expect(normalizeJPPhone("00432345678")).toBe("0432345678");
  });

  // === 81（国際プレフィックス）===
  it("81プレフィックスを除去（11桁以上）", () => {
    expect(normalizeJPPhone("819012345678")).toBe("09012345678");
  });

  it("81プレフィックスで080番号", () => {
    expect(normalizeJPPhone("818012345678")).toBe("08012345678");
  });

  it("81プレフィックスで先頭0が付く場合", () => {
    expect(normalizeJPPhone("81012345678")).toBe("012345678");
  });

  it("81プレフィックスは10桁以下では処理しない", () => {
    // "8112345678" は10桁 → 81処理の対象外
    // ただし8で始まるので先頭0追加 → "08112345678"...
    // 実際は digits = "8112345678" (10桁) → 81処理スキップ → 8始まり → "08112345678"
    expect(normalizeJPPhone("8112345678")).toBe("08112345678");
  });

  // === 先頭0追加（70/80/90始まり）===
  it("90始まりに0を追加", () => {
    expect(normalizeJPPhone("9012345678")).toBe("09012345678");
  });

  it("80始まりに0を追加", () => {
    expect(normalizeJPPhone("8012345678")).toBe("08012345678");
  });

  it("70始まりに0を追加", () => {
    expect(normalizeJPPhone("7012345678")).toBe("07012345678");
  });

  // === 正常な番号はそのまま ===
  it("正常な090番号はそのまま", () => {
    expect(normalizeJPPhone("09012345678")).toBe("09012345678");
  });

  it("正常な080番号はそのまま", () => {
    expect(normalizeJPPhone("08012345678")).toBe("08012345678");
  });

  it("正常な070番号はそのまま", () => {
    expect(normalizeJPPhone("07012345678")).toBe("07012345678");
  });

  it("正常な固定電話番号はそのまま", () => {
    expect(normalizeJPPhone("0312345678")).toBe("0312345678");
  });

  // === ハイフン+国際プレフィックスの複合ケース ===
  it("+81形式（+は数字抽出で消える）", () => {
    expect(normalizeJPPhone("+81-90-1234-5678")).toBe("09012345678");
  });
});
