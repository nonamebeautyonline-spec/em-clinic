// lib/__tests__/reorder-karte.test.ts
// 再処方カルテ生成ロジックのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

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

// Supabaseチェーンモック生成ヘルパー
function createChain(defaultResolve: any = { data: null, error: null }) {
  const chain: any = {};
  ["select", "eq", "neq", "in", "is", "not", "order", "limit", "update", "insert", "maybeSingle", "single"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

// テストケースごとに差し替え可能なチェーン配列
// reorders テーブルは1回の関数呼出しで2回 from("reorders") される
// 1回目: 前回reorder取得（select）、2回目: karte_note更新（update）
let reordersChains: any[] = [];
let reordersCallIndex = 0;

function getReordersChain() {
  const chain = reordersChains[reordersCallIndex] || createChain();
  reordersCallIndex++;
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "reorders") return getReordersChain();
      return createChain();
    }),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: <T>(query: T) => query,
}));

import { extractDose, buildKarteNote, createReorderPaymentKarte } from "@/lib/reorder-karte";
import { supabaseAdmin } from "@/lib/supabase";

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

// === createReorderPaymentKarte テスト ===
describe("createReorderPaymentKarte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reordersChains = [];
    reordersCallIndex = 0;
  });

  it("patientId空 → 早期リターン", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await createReorderPaymentKarte("", "MJL_5mg_1m", "2026-01-01T00:00:00Z");
    expect(logSpy).toHaveBeenCalledWith(
      "[reorder-karte] skipped: missing patientId or productCode"
    );
    // supabaseAdmin.from は呼ばれない
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("productCode空 → 早期リターン", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await createReorderPaymentKarte("patient-1", "", "2026-01-01T00:00:00Z");
    expect(logSpy).toHaveBeenCalledWith(
      "[reorder-karte] skipped: missing patientId or productCode"
    );
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("前回reorderなし → 継続処方のカルテが生成される", async () => {
    const selectChain = createChain({ data: [], error: null });
    const updateChain = createChain({ data: [{ id: 1 }], error: null });
    reordersChains = [selectChain, updateChain];

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await createReorderPaymentKarte("patient-1", "MJL_5mg_1m", "2026-01-01T00:00:00Z");

    // update呼び出しの確認（karte_noteに「継続使用のため処方」が含まれる）
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        karte_note: expect.stringContaining("副作用がなく、継続使用のため処方"),
      })
    );
    // 保存成功ログ
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("[reorder-karte] karte saved")
    );
    logSpy.mockRestore();
  });

  it("前回reorderあり（増量） → 増量処方のカルテ", async () => {
    // 前回2.5mg → 今回5mg（増量）
    const selectChain = createChain({
      data: [
        { product_code: "MJL_5mg_1m", paid_at: "2026-01-02" },
        { product_code: "MJL_2.5mg_1m", paid_at: "2026-01-01" },
      ],
      error: null,
    });
    const updateChain = createChain({ data: [{ id: 2 }], error: null });
    reordersChains = [selectChain, updateChain];

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await createReorderPaymentKarte("patient-1", "MJL_5mg_1m", "2026-01-02T00:00:00Z");

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        karte_note: expect.stringContaining("副作用がなく、効果を感じづらくなり増量処方"),
      })
    );
    logSpy.mockRestore();
  });

  it("前回reorderあり（減量） → 減量処方のカルテ", async () => {
    // 前回10mg → 今回5mg（減量）
    const selectChain = createChain({
      data: [
        { product_code: "MJL_5mg_1m", paid_at: "2026-01-02" },
        { product_code: "MJL_10mg_1m", paid_at: "2026-01-01" },
      ],
      error: null,
    });
    const updateChain = createChain({ data: [{ id: 3 }], error: null });
    reordersChains = [selectChain, updateChain];

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await createReorderPaymentKarte("patient-1", "MJL_5mg_1m", "2026-01-02T00:00:00Z");

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        karte_note: expect.stringContaining("副作用がなく、効果も十分にあったため減量処方"),
      })
    );
    logSpy.mockRestore();
  });

  it("DB更新エラー → エラーログ", async () => {
    const selectChain = createChain({ data: [], error: null });
    const updateChain = createChain({ data: null, error: { message: "DB error" } });
    reordersChains = [selectChain, updateChain];

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await createReorderPaymentKarte("patient-1", "MJL_5mg_1m", "2026-01-01T00:00:00Z");

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[reorder-karte] reorders update error"),
      expect.objectContaining({ message: "DB error" })
    );
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("更新対象なし → ログ出力", async () => {
    const selectChain = createChain({ data: [], error: null });
    const updateChain = createChain({ data: [], error: null });
    reordersChains = [selectChain, updateChain];

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await createReorderPaymentKarte("patient-1", "MJL_5mg_1m", "2026-01-01T00:00:00Z");

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("[reorder-karte] no matching reorder to update")
    );
    logSpy.mockRestore();
  });
});
