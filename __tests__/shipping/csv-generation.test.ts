// __tests__/shipping/csv-generation.test.ts
// 配送CSV生成（ヤマトB2 & 日本郵便）のテスト
import { describe, it, expect } from "vitest";
import {
  normalizePhoneForYamato,
  normalizePostal,
  splitAddressForYamato,
  toCsvRow,
  generateYamatoB2Row,
  YAMATO_B2_HEADER,
  YAMATO_B2_CONFIG,
} from "@/utils/yamato-b2-formatter";
import {
  JAPANPOST_HEADER,
  generateJapanPostRow,
  generateJapanPostCsv,
} from "@/lib/shipping/japanpost";
import { getTrackingUrl } from "@/lib/shipping/types";

// === 電話番号正規化（ヤマト用）===
describe("normalizePhoneForYamato", () => {
  it("正常な番号はそのまま", () => {
    expect(normalizePhoneForYamato("09012345678")).toBe("09012345678");
  });

  it("80始まり → 080 に補完", () => {
    expect(normalizePhoneForYamato("8012345678")).toBe("08012345678");
  });

  it("90始まり → 090 に補完", () => {
    expect(normalizePhoneForYamato("9012345678")).toBe("09012345678");
  });

  it("70始まり → 070 に補完", () => {
    expect(normalizePhoneForYamato("7012345678")).toBe("07012345678");
  });

  it("3始まり → 03 に補完", () => {
    expect(normalizePhoneForYamato("312345678")).toBe("0312345678");
  });

  it("ハイフン付き 80- → 080-", () => {
    expect(normalizePhoneForYamato("80-1234-5678")).toBe("080-1234-5678");
  });

  it("ハイフン付き 90- → 090-", () => {
    expect(normalizePhoneForYamato("90-1234-5678")).toBe("090-1234-5678");
  });

  it("空文字 → 空文字", () => {
    expect(normalizePhoneForYamato("")).toBe("");
  });

  it("数字とハイフン以外は除去", () => {
    // (090) → 090（括弧が除去される）、1234-5678 → 1234-5678
    expect(normalizePhoneForYamato("(090)1234-5678")).toBe("0901234-5678");
  });
});

// === 郵便番号正規化 ===
describe("normalizePostal", () => {
  it("ハイフン付き → 数字のみ7桁", () => {
    expect(normalizePostal("104-0061")).toBe("1040061");
  });

  it("7桁そのまま", () => {
    expect(normalizePostal("1040061")).toBe("1040061");
  });

  it("先頭0欠落（6桁）→ 左ゼロ埋め", () => {
    expect(normalizePostal("040061")).toBe("0040061");
  });

  it("9桁以上 → 末尾7桁を採用", () => {
    expect(normalizePostal("001040061")).toBe("1040061");
  });

  it("空文字 → 空文字", () => {
    expect(normalizePostal("")).toBe("");
  });

  it("全角数字混じり → 数字以外除去", () => {
    // 全角は数字ではないので除去される
    expect(normalizePostal("１０４-0061")).toBe("0000061");
  });
});

// === 住所分割 ===
describe("splitAddressForYamato", () => {
  it("番地 + 建物名を分割", () => {
    const result = splitAddressForYamato("東京都渋谷区神宮前1-2-3 ヒルズタワー101");
    expect(result.addr1).toBeTruthy();
    expect(result.addr2).toBeTruthy();
  });

  it("建物名キーワード（マンション）で分割", () => {
    const result = splitAddressForYamato("東京都中央区銀座7-8-8 銀座マンション5F");
    expect(result.addr2).toContain("マンション");
  });

  it("建物名なし → addr2は空", () => {
    const result = splitAddressForYamato("東京都中央区銀座7-8-8");
    expect(result.addr2).toBe("");
  });

  it("空文字 → 両方空", () => {
    const result = splitAddressForYamato("");
    expect(result.addr1).toBe("");
    expect(result.addr2).toBe("");
  });

  it("全角スペース → 半角スペースに正規化", () => {
    const result = splitAddressForYamato("東京都渋谷区　神宮前1-2-3");
    // 全角スペースが半角に変換される
    expect(result.addr1).not.toContain("　");
  });
});

// === CSV行生成（エスケープ）===
describe("toCsvRow", () => {
  it("通常の文字列をダブルクォートで囲む", () => {
    const row = toCsvRow(["abc", "def"]);
    expect(row).toBe('"abc","def"');
  });

  it("ダブルクォートを含む値をエスケープ", () => {
    const row = toCsvRow(['say "hello"']);
    expect(row).toBe('"say ""hello"""');
  });

  it("null/undefined を空文字に変換", () => {
    const row = toCsvRow([null as any, undefined as any, "value"]);
    expect(row).toBe('"","","value"');
  });

  it("空配列 → 空文字列", () => {
    expect(toCsvRow([])).toBe("");
  });

  it("カンマを含む値は問題なし（ダブルクォートで囲まれるため）", () => {
    const row = toCsvRow(["a,b", "c"]);
    expect(row).toBe('"a,b","c"');
  });
});

// === ヤマトB2 CSV行生成 ===
describe("generateYamatoB2Row", () => {
  const sampleOrder = {
    payment_id: "pay_001",
    name: "田中太郎",
    postal: "104-0061",
    address: "東京都中央区銀座7-8-8",
    email: "test@example.com",
    phone: "09012345678",
  };

  it("55列を生成", () => {
    const row = generateYamatoB2Row(sampleOrder, "2026/02/16");
    expect(row.length).toBe(55);
  });

  it("ヘッダーも55列", () => {
    expect(YAMATO_B2_HEADER.length).toBe(55);
  });

  it("お客様管理番号（1列目）= payment_id", () => {
    const row = generateYamatoB2Row(sampleOrder, "2026/02/16");
    expect(row[0]).toBe("pay_001");
  });

  it("お届け先名（16列目）= name", () => {
    const row = generateYamatoB2Row(sampleOrder, "2026/02/16");
    expect(row[15]).toBe("田中太郎");
  });

  it("敬称（18列目）= 様", () => {
    const row = generateYamatoB2Row(sampleOrder, "2026/02/16");
    expect(row[17]).toBe("様");
  });

  it("沖縄の住所 → 品名が変更される", () => {
    const okinawaOrder = { ...sampleOrder, address: "沖縄県那覇市おもろまち1-2-3" };
    const row = generateYamatoB2Row(okinawaOrder, "2026/02/16");
    // 品名1 は28列目（index 27）
    expect(row[27]).toBe("医薬品・注射器（未使用、引火性・高圧ガスなし）");
  });

  it("沖縄以外 → デフォルトの品名", () => {
    const row = generateYamatoB2Row(sampleOrder, "2026/02/16");
    expect(row[27]).toBe(YAMATO_B2_CONFIG.itemName);
  });

  it("電話番号が正規化される", () => {
    const orderBadPhone = { ...sampleOrder, phone: "9012345678" };
    const row = generateYamatoB2Row(orderBadPhone, "2026/02/16");
    // 9列目（index 8）= お届け先電話番号
    expect(row[8]).toBe("09012345678");
  });

  it("郵便番号がハイフンなしに正規化される", () => {
    const row = generateYamatoB2Row(sampleOrder, "2026/02/16");
    // 11列目（index 10）= お届け先郵便番号
    expect(row[10]).toBe("1040061");
  });
});

// === 日本郵便CSV行生成 ===
describe("generateJapanPostRow", () => {
  const sampleOrder = {
    payment_id: "pay_001",
    name: "田中太郎",
    postal: "104-0061",
    address: "東京都中央区銀座7-8-8",
    email: "test@example.com",
    phone: "09012345678",
  };

  const sampleConfig = {
    senderName: "テストクリニック",
    senderPostal: "1000001",
    senderAddress: "東京都千代田区千代田1-1",
    senderPhone: "0312345678",
    itemName: "サプリメント",
    packageType: "ゆうパック",
  };

  it("30列を生成", () => {
    const row = generateJapanPostRow(sampleOrder, sampleConfig, "2026/02/16");
    expect(row.length).toBe(30);
  });

  it("ヘッダーも30列", () => {
    expect(JAPANPOST_HEADER.length).toBe(30);
  });

  it("お届け先名称（5列目）= name", () => {
    const row = generateJapanPostRow(sampleOrder, sampleConfig, "2026/02/16");
    expect(row[4]).toBe("田中太郎");
  });

  it("敬称（6列目）= 様", () => {
    const row = generateJapanPostRow(sampleOrder, sampleConfig, "2026/02/16");
    expect(row[5]).toBe("様");
  });

  it("着払い（21列目）= 0（元払い）", () => {
    const row = generateJapanPostRow(sampleOrder, sampleConfig, "2026/02/16");
    expect(row[20]).toBe("0");
  });

  it("個数（30列目）= 1", () => {
    const row = generateJapanPostRow(sampleOrder, sampleConfig, "2026/02/16");
    expect(row[29]).toBe("1");
  });

  it("CSV全体生成（ヘッダー + データ行）", () => {
    const csv = generateJapanPostCsv([sampleOrder], sampleConfig, "2026/02/16");
    const lines = csv.split("\r\n");
    expect(lines.length).toBe(2); // ヘッダー + 1行
    expect(lines[0]).toContain("お届け先郵便番号");
  });

  it("複数注文のCSV生成", () => {
    const order2 = { ...sampleOrder, payment_id: "pay_002", name: "山田花子" };
    const csv = generateJapanPostCsv([sampleOrder, order2], sampleConfig, "2026/02/16");
    const lines = csv.split("\r\n");
    expect(lines.length).toBe(3); // ヘッダー + 2行
  });
});

// === 追跡URL生成 ===
describe("getTrackingUrl", () => {
  it("ヤマト追跡URL", () => {
    const url = getTrackingUrl("yamato", "1234567890");
    expect(url).toContain("kuronekoyamato.co.jp");
    expect(url).toContain("1234567890");
  });

  it("日本郵便追跡URL", () => {
    const url = getTrackingUrl("japanpost", "JP1234567890");
    expect(url).toContain("japanpost.jp");
    expect(url).toContain("JP1234567890");
  });
});
