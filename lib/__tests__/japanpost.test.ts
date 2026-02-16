// lib/__tests__/japanpost.test.ts
// 日本郵便ゆうパックCSVフォーマッター テスト
import { describe, it, expect, vi } from "vitest";

// --- モック定義 ---
vi.mock("@/utils/yamato-b2-formatter", () => ({
  normalizePostal: vi.fn((v: string) => v.replace(/-/g, "")),
  normalizePhoneForYamato: vi.fn((v: string) => v),
  splitAddressForYamato: vi.fn((v: string) => ({ addr1: v.slice(0, 20), addr2: v.slice(20) || "" })),
}));

// --- インポート ---
import { JAPANPOST_HEADER, generateJapanPostRow, generateJapanPostCsv } from "@/lib/shipping/japanpost";
import type { OrderData, JapanPostConfig } from "@/lib/shipping/types";

// --- テストデータ ---
const order: OrderData = {
  postal: "123-4567",
  name: "テスト太郎",
  phone: "090-1234-5678",
  address: "東京都渋谷区1-2-3",
  email: "test@example.com",
  payment_id: "pay_001",
};

const config: JapanPostConfig = {
  senderPostal: "100-0001",
  senderAddress: "東京都千代田区1-1",
  senderName: "テストクリニック",
  senderPhone: "03-1234-5678",
  itemName: "医薬品",
  packageType: "ゆうパック",
};

const shipDate = "2026-02-17";

// --- テスト本体 ---
describe("JAPANPOST_HEADER", () => {
  // 1. ヘッダーは30列
  it("30列のヘッダーを持つ", () => {
    expect(JAPANPOST_HEADER.length).toBe(30);
  });
});

describe("generateJapanPostRow", () => {
  // 2. 30要素の配列返却
  it("30要素の配列を返す", () => {
    const row = generateJapanPostRow(order, config, shipDate);
    expect(row.length).toBe(30);
  });

  // 3. お届け先名称 = order.name
  it("お届け先名称にorder.nameが設定される", () => {
    const row = generateJapanPostRow(order, config, shipDate);
    // 5番目の列（index 4）がお届け先名称
    expect(row[4]).toBe("テスト太郎");
  });

  // 4. 敬称 = "様"
  it("敬称が「様」に設定される", () => {
    const row = generateJapanPostRow(order, config, shipDate);
    // 6番目の列（index 5）がお届け先敬称
    expect(row[5]).toBe("様");
  });

  // 5. 着払い = "0"（元払い）
  it("着払いが「0」（元払い）に設定される", () => {
    const row = generateJapanPostRow(order, config, shipDate);
    // 21番目の列（index 20）が着払い
    expect(row[20]).toBe("0");
  });

  // 6. 個数 = "1"
  it("個数が「1」に設定される", () => {
    const row = generateJapanPostRow(order, config, shipDate);
    // 30番目の列（index 29）が個数
    expect(row[29]).toBe("1");
  });
});

describe("generateJapanPostCsv", () => {
  // 7. ヘッダー + データ行
  it("ヘッダー行+データ行のCSVを生成する", () => {
    const csv = generateJapanPostCsv([order], config, shipDate);
    const lines = csv.split("\r\n");

    // ヘッダー行 + データ1行 = 2行
    expect(lines.length).toBe(2);

    // ヘッダー行にヘッダー列名が含まれる
    expect(lines[0]).toContain("お届け先郵便番号");
    expect(lines[0]).toContain("個数");

    // データ行に注文データが含まれる
    expect(lines[1]).toContain("テスト太郎");
    expect(lines[1]).toContain("pay_001");
  });

  // 8. ダブルクォートエスケープ
  it("ダブルクォートを含む値が正しくエスケープされる", () => {
    const orderWithQuote: OrderData = {
      ...order,
      name: 'テスト"太郎"',
    };
    const csv = generateJapanPostCsv([orderWithQuote], config, shipDate);
    const lines = csv.split("\r\n");

    // ダブルクォートが "" にエスケープされる
    expect(lines[1]).toContain('テスト""太郎""');
  });
});
