// AI Source Weights テスト（純ロジック）
import { describe, it, expect, vi } from "vitest";

// supabase mock（importチェーンで必要）
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn() },
}));
import { applySourceWeights, DEFAULT_WEIGHTS, SOURCE_TYPES } from "../ai-source-weights";

describe("applySourceWeights", () => {
  it("デフォルト重み（1.0）では元のスコアが維持される", () => {
    const sources = {
      faq: [{ score: 0.9, content: "FAQ1" }, { score: 0.7, content: "FAQ2" }],
      rule: [{ score: 0.8, content: "Rule1" }],
    };
    const weights = { faq: 1.0, rule: 1.0 };

    const result = applySourceWeights(sources, weights);

    expect(result.faq[0].score).toBe(0.9);
    expect(result.faq[1].score).toBe(0.7);
    expect(result.rule[0].score).toBe(0.8);
  });

  it("重み2.0でスコアが2倍になる", () => {
    const sources = {
      faq: [{ score: 0.5, content: "FAQ" }],
    };
    const weights = { faq: 2.0 };

    const result = applySourceWeights(sources, weights);

    expect(result.faq[0].score).toBe(1.0);
  });

  it("重み0.5でスコアが半分になる", () => {
    const sources = {
      rule: [{ score: 0.8, relevance: 0.6, content: "Rule" }],
    };
    const weights = { rule: 0.5 };

    const result = applySourceWeights(sources, weights);

    expect(result.rule[0].score).toBe(0.4);
    expect(result.rule[0].relevance).toBe(0.3);
  });

  it("重み0のソースは空配列になる", () => {
    const sources = {
      memory: [{ score: 0.9, content: "Memory" }],
      faq: [{ score: 0.8, content: "FAQ" }],
    };
    const weights = { memory: 0, faq: 1.0 };

    const result = applySourceWeights(sources, weights);

    expect(result.memory).toHaveLength(0);
    expect(result.faq).toHaveLength(1);
  });

  it("weightsに未設定のソースはデフォルト（1.0）で処理される", () => {
    const sources = {
      live_data: [{ score: 0.6, content: "Data" }],
    };
    const weights = {}; // 空

    const result = applySourceWeights(sources, weights);

    expect(result.live_data[0].score).toBe(0.6);
  });

  it("scoreもrelevanceもないアイテムはそのまま返される", () => {
    const sources = {
      state: [{ content: "状態データ" }],
    };
    const weights = { state: 1.5 };

    const result = applySourceWeights(sources, weights);

    expect(result.state[0].content).toBe("状態データ");
    expect(result.state[0].score).toBeUndefined();
  });

  it("元のオブジェクトを変更しない（イミュータブル）", () => {
    const original = { faq: [{ score: 0.9, content: "FAQ" }] };
    const weights = { faq: 0.5 };

    applySourceWeights(original, weights);

    expect(original.faq[0].score).toBe(0.9); // 変更されない
  });
});

describe("DEFAULT_WEIGHTS", () => {
  it("全ソースタイプが1.0で定義されている", () => {
    for (const st of SOURCE_TYPES) {
      expect(DEFAULT_WEIGHTS[st]).toBe(1.0);
    }
  });

  it("6つのソースタイプがある", () => {
    expect(SOURCE_TYPES).toHaveLength(6);
  });
});
