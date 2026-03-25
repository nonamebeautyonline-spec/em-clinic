// lib/__tests__/square-csv-parser.test.ts
import { describe, it, expect } from "vitest";
import { parseSquareCsv } from "../square-csv-parser";

describe("parseSquareCsv", () => {
  it("日本語ヘッダーのSquareCSVを正しくパースする", () => {
    const csv = [
      "トークン,商品名,説明,カテゴリ,SKU,バリエーション名,価格,在庫数",
      "abc123,マンジャロ2.5mg,,注射,MJ-25-1M,1ヶ月分,28000,10",
      "def456,マンジャロ5mg,5mg製剤,注射,MJ-50-1M,1ヶ月分,35000,5",
    ].join("\n");

    const result = parseSquareCsv(csv);
    expect(result.headerDetected).toBe(true);
    expect(result.products).toHaveLength(2);
    expect(result.errors).toHaveLength(0);

    expect(result.products[0]).toMatchObject({
      title: "マンジャロ2.5mg (1ヶ月分)",
      code: "MJ-25-1M",
      price: 28000,
      category: "注射",
    });

    expect(result.products[1]).toMatchObject({
      title: "マンジャロ5mg (1ヶ月分)",
      code: "MJ-50-1M",
      price: 35000,
      description: "5mg製剤",
    });
  });

  it("英語ヘッダーにも対応する", () => {
    const csv = [
      "Token,Item Name,Description,Category,SKU,Variation Name,Price",
      "abc,Test Product,,Test,SKU001,Small,1000",
    ].join("\n");

    const result = parseSquareCsv(csv);
    expect(result.headerDetected).toBe(true);
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      title: "Test Product (Small)",
      code: "SKU001",
      price: 1000,
    });
  });

  it("BOM付きUTF-8を処理する", () => {
    const csv = "\uFEFF商品名,SKU,価格\nテスト商品,TEST-001,5000";
    const result = parseSquareCsv(csv);
    expect(result.headerDetected).toBe(true);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].code).toBe("TEST-001");
  });

  it("価格の¥・カンマを除去する", () => {
    const csv = '商品名,SKU,価格\n商品A,A001,"￥28,000"\n商品B,B001,¥35000';
    const result = parseSquareCsv(csv);
    expect(result.products).toHaveLength(2);
    expect(result.products[0].price).toBe(28000);
    expect(result.products[1].price).toBe(35000);
  });

  it("ヘッダーが検出できない場合はエラー", () => {
    const csv = "col1,col2,col3\nval1,val2,val3";
    const result = parseSquareCsv(csv);
    expect(result.headerDetected).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("ヘッダーを検出できません");
  });

  it("空CSVはエラー", () => {
    const result = parseSquareCsv("商品名,価格");
    expect(result.products).toHaveLength(0);
    expect(result.totalRows).toBe(0);
  });

  it("商品名が空の行はスキップしてエラー記録", () => {
    const csv = "商品名,SKU,価格\n,EMPTY-001,1000\n有効商品,OK-001,2000";
    const result = parseSquareCsv(csv);
    expect(result.products).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("商品名が空");
  });

  it("価格が不正な行はスキップ", () => {
    const csv = "商品名,SKU,価格\nテスト,T001,abc\n有効,OK-001,1000";
    const result = parseSquareCsv(csv);
    expect(result.products).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("価格が不正");
  });

  it("SKUが空の場合は商品名からコードを自動生成", () => {
    const csv = "商品名,SKU,価格\nテスト商品,,5000";
    const result = parseSquareCsv(csv);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].code).toBeTruthy();
    expect(result.products[0].code.length).toBeGreaterThan(0);
  });

  it("CSV内でSKUが重複する場合は後の行をエラー", () => {
    const csv = "商品名,SKU,価格\n商品A,DUP-001,1000\n商品B,DUP-001,2000";
    const result = parseSquareCsv(csv);
    expect(result.products).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("重複");
  });

  it("引用符で囲まれたフィールド内のカンマを正しく処理", () => {
    const csv = '商品名,SKU,価格,説明\n"マンジャロ, 2.5mg",MJ-25,28000,"注射薬, 月1回"';
    const result = parseSquareCsv(csv);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].title).toBe("マンジャロ, 2.5mg");
    expect(result.products[0].description).toBe("注射薬, 月1回");
  });

  it("バリエーション名が商品名と同じ場合は重複付加しない", () => {
    const csv = "商品名,バリエーション名,SKU,価格\nテスト,テスト,T001,1000";
    const result = parseSquareCsv(csv);
    expect(result.products[0].title).toBe("テスト");
  });
});
