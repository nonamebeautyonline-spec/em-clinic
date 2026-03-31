// lib/__tests__/cart-abandonment.test.ts
// カゴ落ちリマインドFlexメッセージ生成のテスト
import { describe, it, expect } from "vitest";
import { buildCartReminderMessage } from "../cart-abandonment";

describe("buildCartReminderMessage", () => {
  const singleItemCart = {
    cart_items: [{ name: "テスト商品", price: 1000, quantity: 1 }],
    cart_total: 1000,
  };

  // === Step 1: 基本リマインド ===
  it("Step 1: Flex bubbleのヘッダーに「カートに商品が残っています」を含む", () => {
    const msg = buildCartReminderMessage(singleItemCart, 1);
    expect(msg.type).toBe("flex");
    const bubble = msg.contents as any;
    const headerText = bubble.header.contents[0].text;
    expect(headerText).toBe("カートに商品が残っています");
  });

  it("Step 1: ヘッダー色はデフォルト（#1a1a1a）", () => {
    const msg = buildCartReminderMessage(singleItemCart, 1);
    const bubble = msg.contents as any;
    expect(bubble.header.contents[0].color).toBe("#1a1a1a");
  });

  it("Step 1: フッターに「お買い忘れはございませんか？」を含む", () => {
    const msg = buildCartReminderMessage(singleItemCart, 1);
    const bubble = msg.contents as any;
    expect(bubble.footer.contents[0].text).toBe("お買い忘れはございませんか？");
  });

  // === Step 2: クーポン付きリマインド ===
  it("Step 2: ヘッダーに「お買い忘れはありませんか？」を含む", () => {
    const msg = buildCartReminderMessage(singleItemCart, 2);
    const bubble = msg.contents as any;
    expect(bubble.header.contents[0].text).toBe("お買い忘れはありませんか？");
  });

  it("Step 2: フッターにクーポン訴求テキストを含む", () => {
    const msg = buildCartReminderMessage(singleItemCart, 2);
    const bubble = msg.contents as any;
    expect(bubble.footer.contents[0].text).toBe(
      "今なら限定クーポンをご利用いただけます"
    );
  });

  // === Step 3: 最終リマインド ===
  it("Step 3: ヘッダーに「【最終ご案内】」を含む", () => {
    const msg = buildCartReminderMessage(singleItemCart, 3);
    const bubble = msg.contents as any;
    expect(bubble.header.contents[0].text).toBe("【最終ご案内】");
  });

  it("Step 3: ヘッダー色が赤（#cc0000）", () => {
    const msg = buildCartReminderMessage(singleItemCart, 3);
    const bubble = msg.contents as any;
    expect(bubble.header.contents[0].color).toBe("#cc0000");
  });

  // === 商品0件の場合 ===
  it("商品0件でもエラーにならずFlexメッセージを返す", () => {
    const emptyCart = { cart_items: [], cart_total: 0 };
    const msg = buildCartReminderMessage(emptyCart, 1);
    expect(msg.type).toBe("flex");
    const bubble = msg.contents as any;
    // body にはセパレータと合計のみ
    expect(bubble.body.contents.length).toBeGreaterThanOrEqual(1);
  });

  // === 商品4件以上の場合（「他N件」表示） ===
  it("商品4件の場合、3件表示+「他1件の商品」テキストが表示される", () => {
    const fourItemCart = {
      cart_items: [
        { name: "商品A", price: 1000, quantity: 1 },
        { name: "商品B", price: 2000, quantity: 1 },
        { name: "商品C", price: 3000, quantity: 1 },
        { name: "商品D", price: 4000, quantity: 1 },
      ],
      cart_total: 10000,
    };
    const msg = buildCartReminderMessage(fourItemCart, 1);
    const bubble = msg.contents as any;
    const bodyContents = bubble.body.contents;
    // 商品3件 + 「他1件」+ セパレータ + 合計 = 6要素
    // 「他1件の商品」テキストを含むboxが存在するか確認
    const overflowBox = bodyContents.find(
      (c: any) =>
        c.type === "box" &&
        c.contents?.some((inner: any) => inner.text === "他1件の商品")
    );
    expect(overflowBox).toBeDefined();
  });

  it("商品6件の場合、「他3件の商品」と表示される", () => {
    const sixItemCart = {
      cart_items: Array.from({ length: 6 }, (_, i) => ({
        name: `商品${i + 1}`,
        price: 1000,
        quantity: 1,
      })),
      cart_total: 6000,
    };
    const msg = buildCartReminderMessage(sixItemCart, 1);
    const bubble = msg.contents as any;
    const bodyContents = bubble.body.contents;
    const overflowBox = bodyContents.find(
      (c: any) =>
        c.type === "box" &&
        c.contents?.some((inner: any) => inner.text === "他3件の商品")
    );
    expect(overflowBox).toBeDefined();
  });

  // === altText ===
  it("altTextはヘッダーテキストと一致する", () => {
    const msg = buildCartReminderMessage(singleItemCart, 1);
    expect(msg.altText).toBe("カートに商品が残っています");
  });

  it("Step 3のaltTextは「【最終ご案内】」", () => {
    const msg = buildCartReminderMessage(singleItemCart, 3);
    expect(msg.altText).toBe("【最終ご案内】");
  });
});
