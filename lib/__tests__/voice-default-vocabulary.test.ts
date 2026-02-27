import { describe, it, expect } from "vitest";
import {
  getDefaultVocabulary,
  getVocabularySummary,
  DEFAULT_VOCABULARY,
  SPECIALTY_LABELS,
  CATEGORY_LABELS,
  type Specialty,
  type VocabEntry,
} from "../voice/default-vocabulary";

// ================================================================
// SPECIALTY_LABELS
// ================================================================
describe("SPECIALTY_LABELS", () => {
  const allSpecialties: Specialty[] = [
    "common",
    "beauty",
    "internal",
    "surgery",
    "orthopedics",
    "dermatology",
  ];

  it("全6科のラベルが定義されている", () => {
    for (const sp of allSpecialties) {
      expect(SPECIALTY_LABELS[sp]).toBeDefined();
      expect(typeof SPECIALTY_LABELS[sp]).toBe("string");
      expect(SPECIALTY_LABELS[sp].length).toBeGreaterThan(0);
    }
  });

  it("キー数が6つである", () => {
    expect(Object.keys(SPECIALTY_LABELS)).toHaveLength(6);
  });
});

// ================================================================
// CATEGORY_LABELS
// ================================================================
describe("CATEGORY_LABELS", () => {
  const allCategories: VocabEntry["category"][] = [
    "drug",
    "symptom",
    "procedure",
    "anatomy",
    "lab",
    "general",
  ];

  it("全6カテゴリのラベルが定義されている", () => {
    for (const cat of allCategories) {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
      expect(typeof CATEGORY_LABELS[cat]).toBe("string");
    }
  });
});

// ================================================================
// DEFAULT_VOCABULARY
// ================================================================
describe("DEFAULT_VOCABULARY", () => {
  it("全6科にエントリ配列が存在する", () => {
    for (const key of Object.keys(SPECIALTY_LABELS) as Specialty[]) {
      expect(Array.isArray(DEFAULT_VOCABULARY[key])).toBe(true);
      expect(DEFAULT_VOCABULARY[key].length).toBeGreaterThan(0);
    }
  });

  it("各エントリがterm・category・boost_weightを持つ", () => {
    for (const entries of Object.values(DEFAULT_VOCABULARY)) {
      for (const entry of entries) {
        expect(typeof entry.term).toBe("string");
        expect(entry.term.length).toBeGreaterThan(0);
        expect(typeof entry.category).toBe("string");
        expect(typeof entry.boost_weight).toBe("number");
        expect(entry.boost_weight).toBeGreaterThan(0);
      }
    }
  });
});

// ================================================================
// getDefaultVocabulary
// ================================================================
describe("getDefaultVocabulary", () => {
  it("空配列の場合、COMMONのみ返す", () => {
    const result = getDefaultVocabulary([]);
    expect(result.length).toBe(DEFAULT_VOCABULARY.common.length);
    // COMMON全エントリのtermが含まれている
    const commonTerms = DEFAULT_VOCABULARY.common.map((v) => v.term);
    const resultTerms = result.map((v) => v.term);
    for (const t of commonTerms) {
      expect(resultTerms).toContain(t);
    }
  });

  it('["beauty"]を指定するとCOMMON+BEAUTYが含まれる', () => {
    const result = getDefaultVocabulary(["beauty"]);
    expect(result.length).toBeGreaterThan(DEFAULT_VOCABULARY.common.length);
  });

  it('"common"をspecialtiesに含めてもスキップされる（結果は同じ）', () => {
    const withCommon = getDefaultVocabulary(["common", "beauty"]);
    const withoutCommon = getDefaultVocabulary(["beauty"]);
    expect(withCommon.length).toBe(withoutCommon.length);
    // term一覧が一致
    const termsA = withCommon.map((v) => v.term).sort();
    const termsB = withoutCommon.map((v) => v.term).sort();
    expect(termsA).toEqual(termsB);
  });

  it("複数科を指定すると合算される", () => {
    const beauty = getDefaultVocabulary(["beauty"]);
    const internal = getDefaultVocabulary(["internal"]);
    const both = getDefaultVocabulary(["beauty", "internal"]);
    // 合算は各科単独より多い（重複除外後なので単純加算ではないが、少なくとも各単独以上）
    expect(both.length).toBeGreaterThanOrEqual(beauty.length);
    expect(both.length).toBeGreaterThanOrEqual(internal.length);
  });

  it("重複termはSetで除去される（同一termが2回含まれない）", () => {
    const result = getDefaultVocabulary([
      "beauty",
      "internal",
      "surgery",
      "orthopedics",
      "dermatology",
    ]);
    const terms = result.map((v) => v.term);
    const uniqueTerms = new Set(terms);
    expect(terms.length).toBe(uniqueTerms.size);
  });

  it("返されるエントリは全てterm/category/boost_weightを持つ", () => {
    const result = getDefaultVocabulary(["beauty", "internal"]);
    for (const entry of result) {
      expect(typeof entry.term).toBe("string");
      expect(typeof entry.category).toBe("string");
      expect(typeof entry.boost_weight).toBe("number");
    }
  });
});

// ================================================================
// getVocabularySummary
// ================================================================
describe("getVocabularySummary", () => {
  it("全6キーが含まれる", () => {
    const summary = getVocabularySummary();
    const keys = Object.keys(summary);
    expect(keys).toHaveLength(6);
    expect(keys).toContain("common");
    expect(keys).toContain("beauty");
    expect(keys).toContain("internal");
    expect(keys).toContain("surgery");
    expect(keys).toContain("orthopedics");
    expect(keys).toContain("dermatology");
  });

  it("各値が0より大きい", () => {
    const summary = getVocabularySummary();
    for (const count of Object.values(summary)) {
      expect(count).toBeGreaterThan(0);
    }
  });

  it("各値がDEFAULT_VOCABULARYのエントリ数と一致する", () => {
    const summary = getVocabularySummary();
    for (const [key, count] of Object.entries(summary)) {
      expect(count).toBe(DEFAULT_VOCABULARY[key as Specialty].length);
    }
  });
});
