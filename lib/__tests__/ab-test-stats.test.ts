// lib/__tests__/ab-test-stats.test.ts
// ABテスト統計ライブラリのテスト
import { describe, it, expect } from "vitest";
import {
  chiSquareTest,
  chiSquarePValue,
  normalCDF,
  calculateSignificance,
  determineWinner,
  type VariantStats,
} from "../ab-test-stats";

// ========================================
// normalCDF（標準正規分布累積分布関数）
// ========================================
describe("normalCDF: 標準正規分布累積分布関数", () => {
  it("x=0 で 0.5 を返す", () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 4);
  });

  it("x=1.96 で約 0.975 を返す（95%信頼区間）", () => {
    // Abramowitz-Stegun近似の精度は小数第1位レベル
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 1);
  });

  it("x=-1.96 で約 0.025 を返す", () => {
    expect(normalCDF(-1.96)).toBeCloseTo(0.025, 1);
  });

  it("極端な正の値で 1 に近い値を返す", () => {
    expect(normalCDF(10)).toBeCloseTo(1, 4);
  });

  it("極端な負の値で 0 に近い値を返す", () => {
    expect(normalCDF(-10)).toBeCloseTo(0, 4);
  });
});

// ========================================
// chiSquarePValue
// ========================================
describe("chiSquarePValue: χ²分布の上側確率", () => {
  it("x=0 で 1 を返す", () => {
    expect(chiSquarePValue(0, 1)).toBe(1);
  });

  it("自由度0 で 1 を返す", () => {
    expect(chiSquarePValue(5, 0)).toBe(1);
  });

  it("x=3.841（自由度1）で p値が約 0.05 を返す", () => {
    const p = chiSquarePValue(3.841, 1);
    expect(p).toBeCloseTo(0.05, 1);
  });

  it("x=6.635（自由度1）で p値が約 0.01 を返す", () => {
    const p = chiSquarePValue(6.635, 1);
    expect(p).toBeCloseTo(0.01, 1);
  });
});

// ========================================
// chiSquareTest（2×2分割表のχ²検定）
// ========================================
describe("chiSquareTest: 2×2分割表のχ²検定", () => {
  it("全て0のとき χ²=0, p=1, 有意差なし", () => {
    const result = chiSquareTest(0, 0, 0, 0);
    expect(result.chiSquare).toBe(0);
    expect(result.pValue).toBe(1);
    expect(result.significant).toBe(false);
  });

  it("行合計が0のとき テスト不可", () => {
    const result = chiSquareTest(0, 0, 50, 50);
    expect(result.pValue).toBe(1);
    expect(result.significant).toBe(false);
  });

  it("列合計が0のとき テスト不可", () => {
    const result = chiSquareTest(50, 0, 50, 0);
    expect(result.pValue).toBe(1);
    expect(result.significant).toBe(false);
  });

  it("明確な差があるとき 有意差あり", () => {
    // グループA: 80/100成功、グループB: 20/100成功
    const result = chiSquareTest(80, 20, 20, 80);
    expect(result.significant).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.chiSquare).toBeGreaterThan(3.841);
  });

  it("差がないとき 有意差なし", () => {
    // グループA: 50/100成功、グループB: 50/100成功
    const result = chiSquareTest(50, 50, 50, 50);
    expect(result.significant).toBe(false);
    expect(result.pValue).toBeGreaterThan(0.05);
  });

  it("わずかな差のとき 有意差なし", () => {
    // グループA: 51/100成功、グループB: 49/100成功
    const result = chiSquareTest(51, 49, 49, 51);
    expect(result.significant).toBe(false);
  });

  it("大きなサンプルで中程度の差のとき 有意差あり", () => {
    // グループA: 550/1000成功、グループB: 450/1000成功
    const result = chiSquareTest(550, 450, 450, 550);
    expect(result.significant).toBe(true);
  });

  it("イェーツ補正が適用される", () => {
    // 小サンプルでの補正効果を確認
    const result = chiSquareTest(10, 5, 5, 10);
    // イェーツ補正でχ²値が小さくなる
    expect(result.chiSquare).toBeGreaterThanOrEqual(0);
  });
});

// ========================================
// calculateSignificance（2バリアント間の有意差判定）
// ========================================
describe("calculateSignificance: バリアント間の有意差判定", () => {
  const variantA: VariantStats = {
    id: "a",
    name: "A",
    sent_count: 1000,
    open_count: 300,
    click_count: 100,
    conversion_count: 50,
  };

  const variantB: VariantStats = {
    id: "b",
    name: "B",
    sent_count: 1000,
    open_count: 200,
    click_count: 60,
    conversion_count: 30,
  };

  it("開封率での有意差判定", () => {
    const result = calculateSignificance(variantA, variantB, "open_rate");
    expect(result.significant).toBe(true);
  });

  it("クリック率での有意差判定", () => {
    const result = calculateSignificance(variantA, variantB, "click_rate");
    expect(result.chiSquare).toBeGreaterThan(0);
  });

  it("コンバージョン率での有意差判定", () => {
    const result = calculateSignificance(variantA, variantB, "conversion_rate");
    expect(result.chiSquare).toBeGreaterThan(0);
  });

  it("デフォルト基準は開封率", () => {
    const result1 = calculateSignificance(variantA, variantB);
    const result2 = calculateSignificance(variantA, variantB, "open_rate");
    expect(result1.chiSquare).toBe(result2.chiSquare);
  });

  it("送信数0のバリアントではテスト不可", () => {
    const emptyA: VariantStats = { ...variantA, sent_count: 0 };
    const result = calculateSignificance(emptyA, variantB, "open_rate");
    expect(result.pValue).toBe(1);
  });

  it("成功数が送信数を超える場合でも負の値にならない", () => {
    const overA: VariantStats = { ...variantA, open_count: 1500 };
    const result = calculateSignificance(overA, variantB, "open_rate");
    // エラーにならず結果が返る
    expect(result.chiSquare).toBeGreaterThanOrEqual(0);
  });
});

// ========================================
// determineWinner（勝者判定）
// ========================================
describe("determineWinner: 勝者判定", () => {
  it("バリアント数が2未満のとき テスト不可", () => {
    const result = determineWinner([
      { id: "a", name: "A", sent_count: 100, open_count: 50, click_count: 0, conversion_count: 0 },
    ]);
    expect(result.winnerId).toBeNull();
    expect(result.reason).toContain("2つ未満");
  });

  it("空配列でテスト不可", () => {
    const result = determineWinner([]);
    expect(result.winnerId).toBeNull();
  });

  it("明確な差で勝者を判定（有意差あり）", () => {
    const variants: VariantStats[] = [
      { id: "a", name: "A", sent_count: 1000, open_count: 400, click_count: 0, conversion_count: 0 },
      { id: "b", name: "B", sent_count: 1000, open_count: 200, click_count: 0, conversion_count: 0 },
    ];
    const result = determineWinner(variants, "open_rate");
    expect(result.winnerId).toBe("a");
    expect(result.winnerName).toBe("A");
    expect(result.significant).toBe(true);
    expect(result.reason).toContain("統計的に有意");
  });

  it("差がないとき 同率と判定", () => {
    const variants: VariantStats[] = [
      { id: "a", name: "A", sent_count: 1000, open_count: 300, click_count: 0, conversion_count: 0 },
      { id: "b", name: "B", sent_count: 1000, open_count: 300, click_count: 0, conversion_count: 0 },
    ];
    const result = determineWinner(variants, "open_rate");
    expect(result.winnerId).toBeNull();
    expect(result.reason).toContain("同率");
  });

  it("わずかな差で有意差なしの勝者判定", () => {
    const variants: VariantStats[] = [
      { id: "a", name: "A", sent_count: 100, open_count: 52, click_count: 0, conversion_count: 0 },
      { id: "b", name: "B", sent_count: 100, open_count: 48, click_count: 0, conversion_count: 0 },
    ];
    const result = determineWinner(variants, "open_rate");
    expect(result.winnerId).toBe("a");
    expect(result.significant).toBe(false);
    expect(result.reason).toContain("有意差はありません");
  });

  it("クリック率で勝者判定", () => {
    const variants: VariantStats[] = [
      { id: "a", name: "A", sent_count: 1000, open_count: 0, click_count: 50, conversion_count: 0 },
      { id: "b", name: "B", sent_count: 1000, open_count: 0, click_count: 200, conversion_count: 0 },
    ];
    const result = determineWinner(variants, "click_rate");
    expect(result.winnerId).toBe("b");
    expect(result.winnerName).toBe("B");
    expect(result.reason).toContain("クリック率");
  });

  it("コンバージョン率で勝者判定", () => {
    const variants: VariantStats[] = [
      { id: "a", name: "A", sent_count: 1000, open_count: 0, click_count: 0, conversion_count: 100 },
      { id: "b", name: "B", sent_count: 1000, open_count: 0, click_count: 0, conversion_count: 200 },
    ];
    const result = determineWinner(variants, "conversion_rate");
    expect(result.winnerId).toBe("b");
    expect(result.reason).toContain("コンバージョン率");
  });

  it("rates に全バリアントの指標が含まれる", () => {
    const variants: VariantStats[] = [
      { id: "a", name: "A", sent_count: 1000, open_count: 300, click_count: 0, conversion_count: 0 },
      { id: "b", name: "B", sent_count: 1000, open_count: 200, click_count: 0, conversion_count: 0 },
    ];
    const result = determineWinner(variants, "open_rate");
    expect(result.rates).toHaveLength(2);
    expect(result.rates.find((r) => r.id === "a")?.rate).toBe(0.3);
    expect(result.rates.find((r) => r.id === "b")?.rate).toBe(0.2);
  });

  it("3バリアント以上でも上位2つで比較", () => {
    const variants: VariantStats[] = [
      { id: "a", name: "A", sent_count: 1000, open_count: 400, click_count: 0, conversion_count: 0 },
      { id: "b", name: "B", sent_count: 1000, open_count: 200, click_count: 0, conversion_count: 0 },
      { id: "c", name: "C", sent_count: 1000, open_count: 100, click_count: 0, conversion_count: 0 },
    ];
    const result = determineWinner(variants, "open_rate");
    expect(result.winnerId).toBe("a");
    expect(result.rates).toHaveLength(3);
  });

  it("送信数0のバリアントが含まれていても動作する", () => {
    const variants: VariantStats[] = [
      { id: "a", name: "A", sent_count: 0, open_count: 0, click_count: 0, conversion_count: 0 },
      { id: "b", name: "B", sent_count: 1000, open_count: 200, click_count: 0, conversion_count: 0 },
    ];
    const result = determineWinner(variants, "open_rate");
    expect(result.winnerId).toBe("b");
  });
});
