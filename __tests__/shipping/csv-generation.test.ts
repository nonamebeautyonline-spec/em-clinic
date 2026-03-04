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
  zenWidth,
  splitAtZenWidth,
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
  // 既存回帰テスト
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
    expect(result.addr1).not.toContain("　");
  });

  // カタカナ長音符ーの保持（旧バグ: ー→-化け）
  it("アパートの長音符ーが保持される", () => {
    const r = splitAddressForYamato("東京都大田区南蒲田二丁目26-2第２アパート111号室");
    expect(r.addr1).toBe("東京都大田区南蒲田二丁目26-2");
    expect(r.addr2).toBe("第2アパート111号室"); // 全角数字は半角に正規化
  });

  it("コーポの長音符ーが保持される", () => {
    const r = splitAddressForYamato("長崎県対馬市美津島町鶏知甲119-2孝美コーポ102");
    expect(r.addr2).toBe("孝美コーポ102");
  });

  it("タワーの長音符ーが保持される", () => {
    const r = splitAddressForYamato("東京都渋谷区神宮前1-2-3 ヒルズタワー101");
    expect(r.addr2).toContain("タワー");
  });

  it("数字間の長音符ーはハイフンに変換", () => {
    const r = splitAddressForYamato("東京都中央区銀座7ー8ー8");
    expect(r.addr1).toContain("7-8-8");
  });

  // 建物名全体がaddr2に入る（旧バグ: 建物名の一部がaddr1に残留）
  it("春陽ハイツ → 建物名全体がaddr2", () => {
    const r = splitAddressForYamato("東京都練馬区上石神井1-39-27 春陽ハイツ202");
    expect(r.addr1).toBe("東京都練馬区上石神井1-39-27");
    expect(r.addr2).toBe("春陽ハイツ202");
  });

  it("うみそら前マンション → 建物名全体がaddr2", () => {
    const r = splitAddressForYamato("沖縄県那覇市西3丁目15-27 うみそら前マンション203");
    expect(r.addr1).toBe("沖縄県那覇市西3丁目15-27");
    expect(r.addr2).toBe("うみそら前マンション203");
  });

  it("ガーラレジデンス → 建物名全体がaddr2", () => {
    const r = splitAddressForYamato("東京都府中市宮西町5-10-1ガーラレジデンス府中宮西町５０３");
    expect(r.addr1).toBe("東京都府中市宮西町5-10-1");
    expect(r.addr2).toBe("ガーラレジデンス府中宮西町503"); // 全角数字は半角に正規化
  });

  // 号室だけがaddr2にならない（旧バグ: 接尾辞のみ分離）
  it("号室だけのaddr2にならない — M-10 206号室", () => {
    const r = splitAddressForYamato("東京都小金井市本町5-13-12 M-10 206号室");
    expect(r.addr1).toBe("東京都小金井市本町5-13-12");
    expect(r.addr2).toBe("M-10 206号室");
  });

  it("号室だけのaddr2にならない — パレステージ", () => {
    const r = splitAddressForYamato("東京都練馬区中村北3-16-13 日神パレステージ中村橋 1001号室");
    expect(r.addr1).toBe("東京都練馬区中村北3-16-13");
    expect(r.addr2).toBe("日神パレステージ中村橋 1001号室");
  });

  // 番地ブロック正規表現の改善（旧バグ: 番地切れ）
  it("丁目-番-号パターンで正しく分割", () => {
    const r = splitAddressForYamato("埼玉県さいたま市岩槻区西町1丁目3番2号Kヴェスト505");
    expect(r.addr1).toBe("埼玉県さいたま市岩槻区西町1丁目3番2号");
    expect(r.addr2).toBe("Kヴェスト505");
  });

  it("丁目-番-号 + 改行あり住所", () => {
    const r = splitAddressForYamato("東京都世田谷区桜3丁目6番18号\nソノ・フェリーチェ101号");
    expect(r.addr1).toBe("東京都世田谷区桜3丁目6番18号");
    expect(r.addr2).toBe("ソノ・フェリーチェ101号");
  });

  it("番地で終わる住所 → addr2は空", () => {
    const r = splitAddressForYamato("愛知県田原市伊川津町郷中39番地");
    expect(r.addr1).toBe("愛知県田原市伊川津町郷中39番地");
    expect(r.addr2).toBe("");
  });

  // ハイフン連結番地（部屋番号埋め込み）
  it("ハイフン連結 → addr1にまとまる", () => {
    const r = splitAddressForYamato("東京都品川区南大井5-13-5-408");
    expect(r.addr1).toBe("東京都品川区南大井5-13-5-408");
    expect(r.addr2).toBe("");
  });

  // 番+号パターン（丁目なし）: 6番21号グリーンコーポ
  it("番+号パターンで号まで正しくキャプチャ", () => {
    const r = splitAddressForYamato("宮崎県宮崎市中村東一丁目6番21号グリーンコーポ202");
    expect(r.addr1).toBe("宮崎県宮崎市中村東一丁目6番21号");
    expect(r.addr2).toBe("グリーンコーポ202");
  });

  // 全角数字の正規化: ２丁目 → 2丁目
  it("全角数字が半角に正規化される", () => {
    const r = splitAddressForYamato("東京都渋谷区本町２丁目12番3号-405");
    expect(r.addr1).toBe("東京都渋谷区本町2丁目12番3号-405");
    expect(r.addr2).toBe("");
  });

  // 階数記号F: 1-21-7-2F → addr1に番地、addr2に2F
  it("末尾2Fが階数として正しくaddr2になる", () => {
    const r = splitAddressForYamato("千葉県船橋市西船1-21-7-2F");
    expect(r.addr1).toBe("千葉県船橋市西船1-21-7");
    expect(r.addr2).toBe("2F");
  });
});

// === 全角文字幅ヘルパー ===
describe("zenWidth / splitAtZenWidth", () => {
  it("全角文字は幅1", () => {
    expect(zenWidth("あいう")).toBe(3);
  });

  it("半角文字は幅0.5（切り上げ）", () => {
    expect(zenWidth("abc")).toBe(2); // 1.5 → 2
  });

  it("全角16文字で分割", () => {
    const { head, tail } = splitAtZenWidth("アザーレパッシオ読売ランド前弐番館 106号室", 16);
    expect(zenWidth(head)).toBeLessThanOrEqual(16);
    expect(tail.length).toBeGreaterThan(0);
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
    const row = toCsvRow([null as unknown as string, undefined as unknown as string, "value"]);
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

  it("addr2が全角16文字超 → 14列目に溢れる", () => {
    const longAddr = {
      ...sampleOrder,
      address: "神奈川県川崎市多摩区西生田3-14-20 アザーレパッシオ読売ランド前弐番館 106号室",
    };
    const row = generateYamatoB2Row(longAddr, "2026/02/16");
    // 13列目（index 12）= アパマン: 全角16文字以内
    expect(zenWidth(row[12])).toBeLessThanOrEqual(16);
    // 14列目（index 13）= 会社部門1: 溢れ分が入っている
    expect(row[13].length).toBeGreaterThan(0);
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
