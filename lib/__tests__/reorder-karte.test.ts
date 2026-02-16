// lib/__tests__/reorder-karte.test.ts
// 再処方カルテ生成ロジックのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractDose, buildKarteNote } from "@/lib/reorder-karte";

// formatProductCode のモック（supabase等の外部依存を遮断）
vi.mock("@/lib/patient-utils", () => ({
  formatProductCode: (code: string) =>
    code
      .replace("MJL_", "マンジャロ ")
      .replace("_", " ")
      .replace("1m", "1ヶ月")
      .replace("2m", "2ヶ月")
      .replace("3m", "3ヶ月"),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {},
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: <T>(query: T) => query,
}));

// === extractDose テスト ===
describe("extractDose", () => {
  it("整数mg値を抽出", () => {
    expect(extractDose("MJL_10mg_3m")).toBe(10);
  });

  it("小数mg値を抽出", () => {
    expect(extractDose("MJL_2.5mg_1m")).toBe(2.5);
  });

  it("5mg値を抽出", () => {
    expect(extractDose("MJL_5mg_1m")).toBe(5);
  });

  it("7.5mg値を抽出", () => {
    expect(extractDose("MJL_7.5mg_3m")).toBe(7.5);
  });

  it("15mg値を抽出", () => {
    expect(extractDose("MJL_15mg_1m")).toBe(15);
  });

  it("マッチしない場合はnullを返す", () => {
    expect(extractDose("INVALID_CODE")).toBeNull();
  });

  it("空文字列はnullを返す", () => {
    expect(extractDose("")).toBeNull();
  });

  it("mgなしの数字はマッチしない", () => {
    expect(extractDose("MJL_10_3m")).toBeNull();
  });
});

// === buildKarteNote テスト ===
describe("buildKarteNote", () => {
  it("増量処方（prev < current）", () => {
    const note = buildKarteNote("MJL_5mg_1m", 2.5, 5);
    expect(note).toContain("再処方希望");
    expect(note).toContain("マンジャロ 5mg 1ヶ月");
    expect(note).toContain("副作用がなく、効果を感じづらくなり増量処方");
  });

  it("減量処方（prev > current）", () => {
    const note = buildKarteNote("MJL_2.5mg_1m", 5, 2.5);
    expect(note).toContain("再処方希望");
    expect(note).toContain("副作用がなく、効果も十分にあったため減量処方");
  });

  it("同量処方（prev == current）", () => {
    const note = buildKarteNote("MJL_5mg_1m", 5, 5);
    expect(note).toContain("再処方希望");
    expect(note).toContain("副作用がなく、継続使用のため処方");
  });

  it("初回処方（prevDose = null）", () => {
    const note = buildKarteNote("MJL_5mg_1m", null, 5);
    expect(note).toContain("副作用がなく、継続使用のため処方");
  });

  it("currentDose = null", () => {
    const note = buildKarteNote("MJL_5mg_1m", 5, null);
    expect(note).toContain("副作用がなく、継続使用のため処方");
  });

  it("両方null", () => {
    const note = buildKarteNote("MJL_5mg_1m", null, null);
    expect(note).toContain("副作用がなく、継続使用のため処方");
  });

  it("出力フォーマットが正しい（改行区切り3行）", () => {
    const note = buildKarteNote("MJL_5mg_1m", 2.5, 5);
    const lines = note.split("\n");
    expect(lines[0]).toBe("再処方希望");
    expect(lines[1]).toMatch(/^商品: /);
    expect(lines[2]).toMatch(/^副作用がなく/);
  });
});
