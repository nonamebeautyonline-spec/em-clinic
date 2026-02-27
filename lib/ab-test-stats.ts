// lib/ab-test-stats.ts — ABテスト統計的有意差判定ユーティリティ

/**
 * バリアントの集計データ
 */
export interface VariantStats {
  id: string;
  name: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  conversion_count: number;
}

/**
 * χ²検定の結果
 */
export interface ChiSquareResult {
  chiSquare: number;
  pValue: number;
  significant: boolean; // p < 0.05
}

/**
 * 勝者判定の結果
 */
export interface WinnerResult {
  winnerId: string | null;
  winnerName: string | null;
  reason: string;
  significant: boolean;
  pValue: number;
  rates: { id: string; name: string; rate: number }[];
}

/**
 * 2×2分割表のχ²検定（イェーツ補正付き）
 *
 * 分割表:
 *           成功    失敗
 * グループA  a       b
 * グループB  c       d
 *
 * @param a グループAの成功数
 * @param b グループAの失敗数
 * @param c グループBの成功数
 * @param d グループBの失敗数
 * @returns χ²検定結果（χ²値、p値、有意差判定）
 */
export function chiSquareTest(
  a: number,
  b: number,
  c: number,
  d: number,
): ChiSquareResult {
  const n = a + b + c + d;

  // サンプルサイズが0の場合
  if (n === 0) {
    return { chiSquare: 0, pValue: 1, significant: false };
  }

  // 期待度数チェック（全セルの期待度数が5以上であることが望ましい）
  const rowTotals = [a + b, c + d];
  const colTotals = [a + c, b + d];

  // 行・列合計が0の場合はテスト不可
  if (rowTotals[0] === 0 || rowTotals[1] === 0 || colTotals[0] === 0 || colTotals[1] === 0) {
    return { chiSquare: 0, pValue: 1, significant: false };
  }

  // イェーツ補正付きχ²値の計算
  // χ² = n * (|ad - bc| - n/2)² / ((a+b)(c+d)(a+c)(b+d))
  const numerator = n * Math.pow(Math.max(Math.abs(a * d - b * c) - n / 2, 0), 2);
  const denominator = rowTotals[0] * rowTotals[1] * colTotals[0] * colTotals[1];

  if (denominator === 0) {
    return { chiSquare: 0, pValue: 1, significant: false };
  }

  const chiSquare = numerator / denominator;
  const pValue = chiSquarePValue(chiSquare, 1);

  return {
    chiSquare: Math.round(chiSquare * 10000) / 10000,
    pValue: Math.round(pValue * 10000) / 10000,
    significant: pValue < 0.05,
  };
}

/**
 * χ²分布の上側確率を近似計算（自由度1）
 * Wilson-Hilferty近似を使用
 *
 * @param x χ²値
 * @param df 自由度（通常1）
 * @returns p値
 */
export function chiSquarePValue(x: number, df: number): number {
  if (x <= 0) return 1;
  if (df <= 0) return 1;

  // 自由度1の場合、正規分布の近似を利用
  // P(χ² > x) = 2 * P(Z > √x) = 2 * (1 - Φ(√x))
  if (df === 1) {
    const z = Math.sqrt(x);
    return 2 * (1 - normalCDF(z));
  }

  // 一般的な場合: Wilson-Hilferty近似
  const k = df;
  const z = Math.pow(x / k, 1 / 3) - (1 - 2 / (9 * k));
  const denom = Math.sqrt(2 / (9 * k));
  const zScore = z / denom;

  return 1 - normalCDF(zScore);
}

/**
 * 標準正規分布の累積分布関数（Abramowitz-Stegun近似）
 */
export function normalCDF(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

/**
 * 2つのバリアント間の統計的有意差を判定
 *
 * @param variantA バリアントAの集計データ
 * @param variantB バリアントBの集計データ
 * @param criteria 判定基準 ('open_rate' | 'click_rate' | 'conversion_rate')
 * @returns χ²検定結果
 */
export function calculateSignificance(
  variantA: VariantStats,
  variantB: VariantStats,
  criteria: string = "open_rate",
): ChiSquareResult {
  // 送信数0のバリアントがある場合はテスト不可
  if (variantA.sent_count === 0 || variantB.sent_count === 0) {
    return { chiSquare: 0, pValue: 1, significant: false };
  }

  let successA: number, failA: number, successB: number, failB: number;

  switch (criteria) {
    case "click_rate":
      successA = variantA.click_count;
      failA = variantA.sent_count - variantA.click_count;
      successB = variantB.click_count;
      failB = variantB.sent_count - variantB.click_count;
      break;
    case "conversion_rate":
      successA = variantA.conversion_count;
      failA = variantA.sent_count - variantA.conversion_count;
      successB = variantB.conversion_count;
      failB = variantB.sent_count - variantB.conversion_count;
      break;
    case "open_rate":
    default:
      successA = variantA.open_count;
      failA = variantA.sent_count - variantA.open_count;
      successB = variantB.open_count;
      failB = variantB.sent_count - variantB.open_count;
      break;
  }

  // 負の値を防止
  failA = Math.max(failA, 0);
  failB = Math.max(failB, 0);

  return chiSquareTest(successA, failA, successB, failB);
}

/**
 * 勝者バリアントを判定
 *
 * @param variants バリアント配列
 * @param criteria 判定基準
 * @returns 勝者判定結果
 */
export function determineWinner(
  variants: VariantStats[],
  criteria: string = "open_rate",
): WinnerResult {
  if (variants.length < 2) {
    return {
      winnerId: null,
      winnerName: null,
      reason: "バリアントが2つ未満のためテスト不可",
      significant: false,
      pValue: 1,
      rates: [],
    };
  }

  // 各バリアントの指標を計算
  const rates = variants.map((v) => {
    let rate = 0;
    if (v.sent_count > 0) {
      switch (criteria) {
        case "click_rate":
          rate = v.click_count / v.sent_count;
          break;
        case "conversion_rate":
          rate = v.conversion_count / v.sent_count;
          break;
        case "open_rate":
        default:
          rate = v.open_count / v.sent_count;
          break;
      }
    }
    return {
      id: v.id,
      name: v.name,
      rate: Math.round(rate * 10000) / 10000, // 小数第4位まで
    };
  });

  // 最高指標のバリアントを特定
  const sorted = [...rates].sort((a, b) => b.rate - a.rate);
  const best = sorted[0];
  const secondBest = sorted[1];

  // 同率の場合
  if (best.rate === secondBest.rate) {
    return {
      winnerId: null,
      winnerName: null,
      reason: "バリアント間の指標が同率のため勝者なし",
      significant: false,
      pValue: 1,
      rates,
    };
  }

  // 上位2つのバリアントでχ²検定
  const bestVariant = variants.find((v) => v.id === best.id)!;
  const secondVariant = variants.find((v) => v.id === secondBest.id)!;
  const testResult = calculateSignificance(bestVariant, secondVariant, criteria);

  const criteriaLabel =
    criteria === "click_rate" ? "クリック率" :
    criteria === "conversion_rate" ? "コンバージョン率" : "開封率";

  if (testResult.significant) {
    return {
      winnerId: best.id,
      winnerName: best.name,
      reason: `${best.name}が${criteriaLabel}で統計的に有意に優れています (p=${testResult.pValue})`,
      significant: true,
      pValue: testResult.pValue,
      rates,
    };
  }

  return {
    winnerId: best.id,
    winnerName: best.name,
    reason: `${best.name}の${criteriaLabel}が高いですが、統計的有意差はありません (p=${testResult.pValue})`,
    significant: false,
    pValue: testResult.pValue,
    rates,
  };
}
