// __tests__/api/bank-transfer.test.ts
// 銀行振込照合ロジック（カタカナ正規化・金額マッチング・CSV解析）のテスト
import { describe, it, expect } from "vitest";

// === normalizeKana のロジックを再実装してテスト ===
function normalizeKana(str: string): string {
  if (!str) return "";
  let normalized = str;

  // 半角カタカナを全角に変換
  const halfToFull: Record<string, string> = {
    "ｱ": "ア", "ｲ": "イ", "ｳ": "ウ", "ｴ": "エ", "ｵ": "オ",
    "ｶ": "カ", "ｷ": "キ", "ｸ": "ク", "ｹ": "ケ", "ｺ": "コ",
    "ｻ": "サ", "ｼ": "シ", "ｽ": "ス", "ｾ": "セ", "ｿ": "ソ",
    "ﾀ": "タ", "ﾁ": "チ", "ﾂ": "ツ", "ﾃ": "テ", "ﾄ": "ト",
    "ﾅ": "ナ", "ﾆ": "ニ", "ﾇ": "ヌ", "ﾈ": "ネ", "ﾉ": "ノ",
    "ﾊ": "ハ", "ﾋ": "ヒ", "ﾌ": "フ", "ﾍ": "ヘ", "ﾎ": "ホ",
    "ﾏ": "マ", "ﾐ": "ミ", "ﾑ": "ム", "ﾒ": "メ", "ﾓ": "モ",
    "ﾔ": "ヤ", "ﾕ": "ユ", "ﾖ": "ヨ",
    "ﾗ": "ラ", "ﾘ": "リ", "ﾙ": "ル", "ﾚ": "レ", "ﾛ": "ロ",
    "ﾜ": "ワ", "ｦ": "ヲ", "ﾝ": "ン",
    "ｧ": "ア", "ｨ": "イ", "ｩ": "ウ", "ｪ": "エ", "ｫ": "オ",
    "ｬ": "ヤ", "ｭ": "ユ", "ｮ": "ヨ", "ｯ": "ツ",
    "ﾞ": "", "ﾟ": "",
    "ｰ": "ー",
  };

  const dakutenMap: Record<string, string> = {
    "ｶﾞ": "ガ", "ｷﾞ": "ギ", "ｸﾞ": "グ", "ｹﾞ": "ゲ", "ｺﾞ": "ゴ",
    "ｻﾞ": "ザ", "ｼﾞ": "ジ", "ｽﾞ": "ズ", "ｾﾞ": "ゼ", "ｿﾞ": "ゾ",
    "ﾀﾞ": "ダ", "ﾁﾞ": "ヂ", "ﾂﾞ": "ヅ", "ﾃﾞ": "デ", "ﾄﾞ": "ド",
    "ﾊﾞ": "バ", "ﾋﾞ": "ビ", "ﾌﾞ": "ブ", "ﾍﾞ": "ベ", "ﾎﾞ": "ボ",
    "ﾊﾟ": "パ", "ﾋﾟ": "ピ", "ﾌﾟ": "プ", "ﾍﾟ": "ペ", "ﾎﾟ": "ポ",
    "ｳﾞ": "ヴ",
  };

  for (const [half, full] of Object.entries(dakutenMap)) {
    normalized = normalized.replace(new RegExp(half, "g"), full);
  }
  for (const [half, full] of Object.entries(halfToFull)) {
    normalized = normalized.replace(new RegExp(half, "g"), full);
  }

  const smallToLarge: Record<string, string> = {
    "ァ": "ア", "ィ": "イ", "ゥ": "ウ", "ェ": "エ", "ォ": "オ",
    "ャ": "ヤ", "ュ": "ユ", "ョ": "ヨ",
    "ッ": "ツ", "ヮ": "ワ", "ヵ": "カ", "ヶ": "ケ",
  };
  for (const [small, large] of Object.entries(smallToLarge)) {
    normalized = normalized.replace(new RegExp(small, "g"), large);
  }

  normalized = normalized.replace(/[\s\-\(\)（）・．.、，,]/g, "");
  normalized = normalized.toUpperCase();
  return normalized;
}

// === カタカナ正規化テスト ===
describe("bank-transfer normalizeKana", () => {
  it("半角カタカナ → 全角カタカナ", () => {
    expect(normalizeKana("ﾀﾅｶ ﾀﾛｳ")).toBe("タナカタロウ");
  });

  it("半角濁音 → 全角濁音", () => {
    expect(normalizeKana("ﾜﾀﾅﾍﾞ")).toBe("ワタナベ");
  });

  it("半角半濁音 → 全角半濁音", () => {
    expect(normalizeKana("ﾊﾟ")).toBe("パ");
  });

  it("全角小文字カタカナ → 大文字", () => {
    expect(normalizeKana("ショウジ")).toBe("シヨウジ");
  });

  it("スペース・記号削除", () => {
    expect(normalizeKana("タナカ　タロウ")).toBe("タナカタロウ");
    expect(normalizeKana("タナカ・タロウ")).toBe("タナカタロウ");
  });

  it("英字は大文字に変換", () => {
    expect(normalizeKana("abc")).toBe("ABC");
  });

  it("括弧の削除", () => {
    expect(normalizeKana("(タナカ)")).toBe("タナカ");
    expect(normalizeKana("（タナカ）")).toBe("タナカ");
  });

  it("空文字列 → 空文字列", () => {
    expect(normalizeKana("")).toBe("");
  });

  it("null相当 → 空文字列", () => {
    expect(normalizeKana("")).toBe("");
  });

  it("長音記号の変換", () => {
    expect(normalizeKana("ﾀﾅｶ ﾀﾛｰ")).toBe("タナカタロー");
  });
});

// === CSVパースロジック ===
describe("bank-transfer CSV解析", () => {
  function parseCsvLine(line: string): string[] {
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cols.push(current.trim());
    return cols;
  }

  it("通常のCSV行をパース", () => {
    const result = parseCsvLine("2026/02/16,タナカ タロウ,0,50000,1000000");
    expect(result).toEqual(["2026/02/16", "タナカ タロウ", "0", "50000", "1000000"]);
  });

  it("ダブルクォート付きフィールド", () => {
    const result = parseCsvLine('"2026/02/16","タナカ タロウ","50,000"');
    expect(result[0]).toBe("2026/02/16");
    expect(result[1]).toBe("タナカ タロウ");
    // カンマはクォート内なので分割されない
    expect(result[2]).toBe("50,000");
  });

  it("空行", () => {
    const result = parseCsvLine("");
    expect(result).toEqual([""]);
  });

  it("カンマのみ", () => {
    const result = parseCsvLine(",,,");
    expect(result).toEqual(["", "", "", ""]);
  });
});

// === 金額パース ===
describe("bank-transfer 金額パース", () => {
  function parseAmount(str: string): number {
    return parseInt(str?.replace(/[,円]/g, "") || "0", 10) || 0;
  }

  it("数値文字列", () => {
    expect(parseAmount("50000")).toBe(50000);
  });

  it("カンマ区切り", () => {
    expect(parseAmount("50,000")).toBe(50000);
  });

  it("円記号付き", () => {
    expect(parseAmount("50,000円")).toBe(50000);
  });

  it("空文字列 → 0", () => {
    expect(parseAmount("")).toBe(0);
  });

  it("0", () => {
    expect(parseAmount("0")).toBe(0);
  });

  it("null相当 → 0", () => {
    expect(parseAmount(undefined as any)).toBe(0);
  });
});

// === 照合ロジック（金額 + 名義人）===
describe("bank-transfer 照合ロジック", () => {
  interface Order {
    id: string;
    patient_id: string;
    amount: number;
    account_name: string;
  }

  interface Transfer {
    description: string;
    amount: number;
  }

  function matchTransfer(transfer: Transfer, orders: Order[], usedIds: Set<string>): Order | null {
    for (const order of orders) {
      if (usedIds.has(order.id)) continue;
      if (order.amount !== transfer.amount) continue;
      if (!order.account_name) continue;

      const descNormalized = normalizeKana(transfer.description);
      const accountNormalized = normalizeKana(order.account_name);

      if (descNormalized.includes(accountNormalized) || transfer.description.includes(order.account_name)) {
        return order;
      }
    }
    return null;
  }

  const orders: Order[] = [
    { id: "bt_pending_1", patient_id: "p1", amount: 50000, account_name: "タナカ タロウ" },
    { id: "bt_pending_2", patient_id: "p2", amount: 30000, account_name: "ヤマダ ハナコ" },
    { id: "bt_pending_3", patient_id: "p3", amount: 50000, account_name: "スズキ イチロウ" },
  ];

  it("金額 + 名義人一致 → マッチ", () => {
    const transfer = { description: "振込 タナカ タロウ", amount: 50000 };
    const result = matchTransfer(transfer, orders, new Set());
    expect(result?.id).toBe("bt_pending_1");
  });

  it("金額一致だが名義人不一致 → マッチしない", () => {
    const transfer = { description: "振込 サトウ ジロウ", amount: 50000 };
    const result = matchTransfer(transfer, orders, new Set());
    expect(result).toBeNull();
  });

  it("名義人一致だが金額不一致 → マッチしない", () => {
    const transfer = { description: "振込 タナカ タロウ", amount: 60000 };
    const result = matchTransfer(transfer, orders, new Set());
    expect(result).toBeNull();
  });

  it("既に使用済みの注文はスキップ", () => {
    const transfer = { description: "振込 タナカ タロウ", amount: 50000 };
    const result = matchTransfer(transfer, orders, new Set(["bt_pending_1"]));
    expect(result).toBeNull(); // タナカはused、スズキは名義不一致
  });

  it("半角カタカナ名義でも正規化でマッチ", () => {
    const transfer = { description: "ﾀﾅｶ ﾀﾛｳ", amount: 50000 };
    const descNorm = normalizeKana(transfer.description);
    const accountNorm = normalizeKana("タナカ タロウ");
    expect(descNorm).toBe(accountNorm);
  });

  it("account_nameが空 → スキップ", () => {
    const ordersWithEmpty = [{ id: "x", patient_id: "p1", amount: 50000, account_name: "" }];
    const transfer = { description: "タナカ", amount: 50000 };
    const result = matchTransfer(transfer, ordersWithEmpty, new Set());
    expect(result).toBeNull();
  });
});

// === bt_ID採番 ===
describe("bank-transfer bt_ID採番", () => {
  function getNextBtId(existingIds: string[]): string {
    let maxNum = 0;
    for (const id of existingIds) {
      const match = id.match(/^bt_(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `bt_${maxNum + 1}`;
  }

  it("既存なし → bt_1", () => {
    expect(getNextBtId([])).toBe("bt_1");
  });

  it("bt_3まで存在 → bt_4", () => {
    expect(getNextBtId(["bt_1", "bt_2", "bt_3"])).toBe("bt_4");
  });

  it("bt_pending_XXX は無視される", () => {
    expect(getNextBtId(["bt_pending_1", "bt_pending_2", "bt_1"])).toBe("bt_2");
  });

  it("飛び番号は最大値+1", () => {
    expect(getNextBtId(["bt_1", "bt_5"])).toBe("bt_6");
  });
});
