// karte-helpers.ts の純粋関数テスト
import { describe, it, expect } from "vitest";
import {
  parseDateToAge,
  formatBirthDisplay,
  formatTelDisplay,
  pick,
  normalizeDateStr,
  displayDateSlash,
  makeTimeRangeLabel,
  formatWeekLabel,
  draftKeyOf,
} from "@/lib/karte-helpers";

describe("parseDateToAge", () => {
  it("生年月日から年齢を返す", () => {
    // 現在日付に依存するため、確実に過去の日付でテスト
    const result = parseDateToAge("2000-01-01");
    expect(result).toMatch(/^\d+歳$/);
    const age = parseInt(result);
    expect(age).toBeGreaterThanOrEqual(25);
    expect(age).toBeLessThanOrEqual(27);
  });

  it("空・undefinedの場合は空文字を返す", () => {
    expect(parseDateToAge(undefined)).toBe("");
    expect(parseDateToAge("")).toBe("");
  });

  it("不正な日付の場合は空文字を返す", () => {
    expect(parseDateToAge("invalid-date")).toBe("");
  });

  it("ドットやハイフン区切りも対応する", () => {
    const r1 = parseDateToAge("2000.06.15");
    const r2 = parseDateToAge("2000-06-15");
    expect(r1).toMatch(/^\d+歳$/);
    expect(r1).toBe(r2);
  });
});

describe("formatBirthDisplay", () => {
  it("ISO日付を YYYY/MM/DD 形式に変換する", () => {
    const result = formatBirthDisplay("2000-01-15");
    expect(result).toBe("2000/01/15");
  });

  it("空・undefinedの場合は空文字を返す", () => {
    expect(formatBirthDisplay(undefined)).toBe("");
    expect(formatBirthDisplay("")).toBe("");
  });

  it("ドット区切りをスラッシュに変換する", () => {
    const result = formatBirthDisplay("2000.01.15");
    // Date パース成功のためロケール変換される
    expect(result).toContain("2000");
    expect(result).toContain("01");
    expect(result).toContain("15");
  });
});

describe("formatTelDisplay", () => {
  it("数字だけを抽出して返す", () => {
    expect(formatTelDisplay("090-1234-5678")).toBe("09012345678");
  });

  it("先頭0がない場合は0を付与する", () => {
    expect(formatTelDisplay("9012345678")).toBe("09012345678");
  });

  it("空・undefinedの場合は空文字を返す", () => {
    expect(formatTelDisplay(undefined)).toBe("");
    expect(formatTelDisplay("")).toBe("");
  });
});

describe("pick", () => {
  it("最初にマッチしたキーの値を返す", () => {
    const row = { name: "太郎", 名前: "花子" };
    expect(pick(row, ["name", "名前"])).toBe("太郎");
  });

  it("最初のキーがnullの場合、次の候補を返す", () => {
    const row = { name: null, 名前: "花子" };
    expect(pick(row, ["name", "名前"])).toBe("花子");
  });

  it("全てnullの場合は空文字を返す", () => {
    const row = { name: null };
    expect(pick(row, ["name", "名前"])).toBe("");
  });
});

describe("normalizeDateStr", () => {
  it("ドット区切りをハイフン区切りに変換する", () => {
    expect(normalizeDateStr("2026.03.08")).toBe("2026-03-08");
  });

  it("スラッシュ区切りをハイフン区切りに変換する", () => {
    expect(normalizeDateStr("2026/03/08")).toBe("2026-03-08");
  });

  it("null/undefinedの場合は空文字を返す", () => {
    expect(normalizeDateStr(null)).toBe("");
    expect(normalizeDateStr(undefined)).toBe("");
  });

  it("10文字を超える場合は切り捨てる", () => {
    expect(normalizeDateStr("2026-03-08T10:00:00")).toBe("2026-03-08");
  });
});

describe("displayDateSlash", () => {
  it("ハイフンをスラッシュに変換する", () => {
    expect(displayDateSlash("2026-03-08")).toBe("2026/03/08");
  });

  it("空文字の場合は空文字を返す", () => {
    expect(displayDateSlash("")).toBe("");
  });
});

describe("makeTimeRangeLabel", () => {
  it("開始時刻から終了時刻の範囲ラベルを生成する（デフォルト15分）", () => {
    expect(makeTimeRangeLabel("10:00")).toBe("10:00-10:15");
  });

  it("分数を指定できる", () => {
    expect(makeTimeRangeLabel("10:00", 30)).toBe("10:00-10:30");
  });

  it("時間をまたぐ場合も正しく計算する", () => {
    expect(makeTimeRangeLabel("09:50", 15)).toBe("09:50-10:05");
  });

  it("空文字の場合は空文字を返す", () => {
    expect(makeTimeRangeLabel("")).toBe("");
  });
});

describe("formatWeekLabel", () => {
  it("ISO日付を M/D（曜日）形式に変換する", () => {
    // 2026-03-08 は日曜日
    const result = formatWeekLabel("2026-03-08");
    expect(result).toContain("3/");
    expect(result).toContain("8");
  });
});

describe("draftKeyOf", () => {
  it("予約IDから下書きキーを生成する", () => {
    expect(draftKeyOf("R001")).toBe("drui_chart_draft_R001");
  });
});
