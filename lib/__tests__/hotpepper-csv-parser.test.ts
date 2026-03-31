// lib/__tests__/hotpepper-csv-parser.test.ts
// SALON BOARD予約CSVパーサーのテスト
import { describe, it, expect } from "vitest";
import { parseHotpepperCsv } from "../hotpepper-csv-parser";

// テスト用CSVヘッダー
const HEADER =
  "予約日,開始時刻,終了時刻,お客様名,電話番号,メニュー名,スタッフ名,金額,ステータス,備考";

describe("parseHotpepperCsv", () => {
  // === 正常なCSVパース ===
  it("ヘッダー+2行の正常CSVをパースできる", () => {
    const csv = [
      HEADER,
      "2026/03/15,10:00,11:00,田中太郎,090-1234-5678,カット,山田,5000,来店済,なし",
      "2026/03/16,14:30,15:30,鈴木花子,080-9876-5432,カラー,佐藤,8000,予約中,初回",
    ].join("\n");

    const result = parseHotpepperCsv(csv);
    expect(result).toHaveLength(2);

    // 1行目
    expect(result[0].customerName).toBe("田中太郎");
    expect(result[0].staffName).toBe("山田");
    expect(result[0].menuName).toBe("カット");
    expect(result[0].amount).toBe(5000);
    expect(result[0].status).toBe("来店済");

    // 2行目
    expect(result[1].customerName).toBe("鈴木花子");
    expect(result[1].amount).toBe(8000);
    expect(result[1].notes).toBe("初回");
  });

  // === BOM付きCSV ===
  it("BOM付きCSVを正しくパースできる", () => {
    const bom = "\uFEFF";
    const csv = bom + [HEADER, "2026/03/15,10:00,11:00,田中太郎,09012345678,カット,山田,5000,来店済,"].join("\n");

    const result = parseHotpepperCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0].customerName).toBe("田中太郎");
  });

  // === 空行スキップ ===
  it("空行はスキップされる", () => {
    const csv = [
      HEADER,
      "2026/03/15,10:00,11:00,田中太郎,09012345678,カット,山田,5000,来店済,なし",
      "",
      "   ",
      "2026/03/16,14:30,15:30,鈴木花子,08098765432,カラー,佐藤,8000,予約中,",
    ].join("\n");

    const result = parseHotpepperCsv(csv);
    expect(result).toHaveLength(2);
  });

  // === 日付フォーマット正規化 ===
  it("yyyy/MM/dd形式がYYYY-MM-DDに正規化される", () => {
    const csv = [
      HEADER,
      "2026/3/5,9:00,10:00,テスト,09012345678,カット,山田,3000,来店済,",
    ].join("\n");

    const result = parseHotpepperCsv(csv);
    expect(result[0].reserveDate).toBe("2026-03-05");
  });

  it("既にYYYY-MM-DD形式の日付はそのまま保持される", () => {
    const csv = [
      HEADER,
      "2026-03-15,10:00,11:00,テスト,09012345678,カット,山田,3000,来店済,",
    ].join("\n");

    const result = parseHotpepperCsv(csv);
    expect(result[0].reserveDate).toBe("2026-03-15");
  });

  // === 時刻の正規化 ===
  it("H:mm形式がHH:mmに正規化される", () => {
    const csv = [
      HEADER,
      "2026/03/15,9:00,9:30,テスト,09012345678,カット,山田,3000,来店済,",
    ].join("\n");

    const result = parseHotpepperCsv(csv);
    expect(result[0].startTime).toBe("09:00");
    expect(result[0].endTime).toBe("09:30");
  });

  // === 金額のカンマ除去 ===
  it("金額のカンマが除去されてnumberに変換される", () => {
    const csv = [
      HEADER,
      '2026/03/15,10:00,11:00,テスト,09012345678,カット+カラー,山田,"12,000",来店済,',
    ].join("\n");

    const result = parseHotpepperCsv(csv);
    expect(result[0].amount).toBe(12000);
  });

  it("円記号付き金額も正しくパースされる", () => {
    const csv = [
      HEADER,
      "2026/03/15,10:00,11:00,テスト,09012345678,カット,山田,¥5000,来店済,",
    ].join("\n");

    const result = parseHotpepperCsv(csv);
    expect(result[0].amount).toBe(5000);
  });

  // === 電話番号のハイフン除去 ===
  it("電話番号のハイフンが除去される", () => {
    const csv = [
      HEADER,
      "2026/03/15,10:00,11:00,テスト,090-1234-5678,カット,山田,5000,来店済,",
    ].join("\n");

    const result = parseHotpepperCsv(csv);
    expect(result[0].phone).toBe("09012345678");
  });

  // === フィールド不足の行 ===
  it("4カラム未満の行はスキップされる", () => {
    const csv = [HEADER, "2026/03/15,10:00,11:00"].join("\n");

    const result = parseHotpepperCsv(csv);
    expect(result).toHaveLength(0);
  });

  // === ヘッダーのみ ===
  it("ヘッダーのみのCSVは空配列を返す", () => {
    const result = parseHotpepperCsv(HEADER);
    expect(result).toHaveLength(0);
  });
});
