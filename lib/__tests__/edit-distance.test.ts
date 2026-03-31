// lib/__tests__/edit-distance.test.ts
// 正規化編集距離のテスト
import { describe, it, expect } from "vitest";
import { normalizedEditDistance } from "@/lib/edit-distance";

describe("normalizedEditDistance", () => {
  // === 完全一致 ===
  it("同一文字列は0を返す", () => {
    expect(normalizedEditDistance("hello", "hello")).toBe(0);
  });

  it("空文字同士は0を返す", () => {
    expect(normalizedEditDistance("", "")).toBe(0);
  });

  // === 空文字との比較 ===
  it("片方が空文字なら1を返す（左が空）", () => {
    expect(normalizedEditDistance("", "abc")).toBe(1);
  });

  it("片方が空文字なら1を返す（右が空）", () => {
    expect(normalizedEditDistance("abc", "")).toBe(1);
  });

  // === 完全不一致 ===
  it("完全に異なる同長文字列は1を返す", () => {
    expect(normalizedEditDistance("abc", "xyz")).toBe(1);
  });

  // === 部分一致 ===
  it("1文字違いの場合、距離は1/最大長", () => {
    // "cat" → "bat" = 編集距離1, 最大長3
    expect(normalizedEditDistance("cat", "bat")).toBeCloseTo(1 / 3);
  });

  it("長さが異なる部分一致", () => {
    // "abc" → "ab" = 編集距離1（削除1回）, 最大長3
    expect(normalizedEditDistance("abc", "ab")).toBeCloseTo(1 / 3);
  });

  it("挿入が必要なケース", () => {
    // "ab" → "abc" = 編集距離1, 最大長3
    expect(normalizedEditDistance("ab", "abc")).toBeCloseTo(1 / 3);
  });

  // === 対称性 ===
  it("引数の順序を入れ替えても同じ結果", () => {
    const d1 = normalizedEditDistance("kitten", "sitting");
    const d2 = normalizedEditDistance("sitting", "kitten");
    expect(d1).toBe(d2);
  });

  // === 値の範囲 ===
  it("結果は常に0以上1以下", () => {
    const pairs: [string, string][] = [
      ["a", "b"],
      ["hello", "world"],
      ["test", "testing"],
      ["", "x"],
      ["same", "same"],
    ];
    for (const [a, b] of pairs) {
      const d = normalizedEditDistance(a, b);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    }
  });

  // === 日本語文字列 ===
  describe("日本語", () => {
    it("同一の日本語文字列は0を返す", () => {
      expect(normalizedEditDistance("東京都", "東京都")).toBe(0);
    });

    it("1文字違いの日本語文字列", () => {
      // "東京都" → "東京府" = 編集距離1, 最大長3
      expect(normalizedEditDistance("東京都", "東京府")).toBeCloseTo(1 / 3);
    });

    it("完全に異なる日本語文字列", () => {
      // "あいう" → "かきく" = 編集距離3, 最大長3
      expect(normalizedEditDistance("あいう", "かきく")).toBe(1);
    });

    it("長さが異なる日本語文字列", () => {
      // "診察" → "診察室" = 編集距離1, 最大長3
      expect(normalizedEditDistance("診察", "診察室")).toBeCloseTo(1 / 3);
    });

    it("ひらがなとカタカナは異なる文字として扱う", () => {
      // "あいう" → "アイウ" = 編集距離3, 最大長3
      expect(normalizedEditDistance("あいう", "アイウ")).toBe(1);
    });
  });

  // === 既知のレーベンシュタイン距離 ===
  it("kitten→sitting の正規化距離が正しい", () => {
    // 編集距離3（k→s, e→i, +g）, 最大長7
    expect(normalizedEditDistance("kitten", "sitting")).toBeCloseTo(3 / 7);
  });
});
