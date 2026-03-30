// lib/__tests__/qa-flex.test.ts
// QA Flexメッセージビルダーのユニットテスト

import { describe, it, expect, vi } from "vitest";

// APP_BASE_URL を設定
vi.stubEnv("APP_BASE_URL", "https://example.com");

const {
  buildQaCarouselFlex,
  buildPostPrescriptionQaCarouselFlex,
  QA_CAROUSEL_ALT_TEXT,
  QA_CAROUSEL_POST_ALT_TEXT,
} = await import("@/lib/qa-flex");

describe("qa-flex - QAカルーセルFlexメッセージ", () => {
  describe("buildQaCarouselFlex - 通常版", () => {
    it("carousel型のオブジェクトを返す", () => {
      const result = buildQaCarouselFlex();
      expect(result.type).toBe("carousel");
    });

    it("カード5枚 +「すべて見る」バブルの計6枚を含む", () => {
      const result = buildQaCarouselFlex();
      const contents = result.contents as any[];
      // QA_CARDS(5枚) + buildMoreBubble(1枚) = 6枚
      expect(contents).toHaveLength(6);
    });

    it("各カードがbubbleタイプ・megaサイズを持つ", () => {
      const result = buildQaCarouselFlex();
      const contents = result.contents as any[];
      // 最初の5枚（QAカード）
      for (let i = 0; i < 5; i++) {
        expect(contents[i].type).toBe("bubble");
        expect(contents[i].size).toBe("mega");
      }
    });

    it("カードの順序が正しい（ご利用の流れ→予約・診察→お支払い→配送→お困りの方へ）", () => {
      const result = buildQaCarouselFlex();
      const contents = result.contents as any[];
      const titles = contents.slice(0, 5).map((c: any) => c.header.contents[0].text);
      expect(titles).toEqual([
        "ご利用の流れ",
        "予約・診察",
        "お支払い",
        "配送・お届け",
        "お困りの方へ",
      ]);
    });

    it("各カードのヘッダーにbackgroundColorが設定されている", () => {
      const result = buildQaCarouselFlex();
      const contents = result.contents as any[];
      for (let i = 0; i < 5; i++) {
        expect(contents[i].header.backgroundColor).toBeTruthy();
        expect(contents[i].header.backgroundColor).toMatch(/^#[0-9a-f]{6}$/);
      }
    });

    it("各カードのフッターにカテゴリIDを含むURIアクションがある", () => {
      const result = buildQaCarouselFlex();
      const contents = result.contents as any[];
      const expectedCategories = ["getting-started", "reservation", "payment", "shipping", "sms-account"];
      for (let i = 0; i < 5; i++) {
        const button = contents[i].footer.contents[1];
        expect(button.action.type).toBe("uri");
        expect(button.action.uri).toContain(`c=${expectedCategories[i]}`);
      }
    });

    it("bodyに箇条書きアイテムが含まれる", () => {
      const result = buildQaCarouselFlex();
      const contents = result.contents as any[];
      // 最初のカード（ご利用の流れ）は6アイテム
      const bodyContents = contents[0].body.contents;
      expect(bodyContents.length).toBe(6);
      // 各アイテムはhorizontalレイアウト
      for (const item of bodyContents) {
        expect(item.type).toBe("box");
        expect(item.layout).toBe("horizontal");
      }
    });
  });

  describe("buildPostPrescriptionQaCarouselFlex - 処方後版", () => {
    it("carousel型のオブジェクトを返す", () => {
      const result = buildPostPrescriptionQaCarouselFlex();
      expect(result.type).toBe("carousel");
    });

    it("カード5枚 +「すべて見る」= 計6枚", () => {
      const result = buildPostPrescriptionQaCarouselFlex();
      const contents = result.contents as any[];
      expect(contents).toHaveLength(6);
    });

    it("処方後版のカード順序が正しい（ご利用の流れ→再処方→お支払い→配送→お困りの方へ）", () => {
      const result = buildPostPrescriptionQaCarouselFlex();
      const contents = result.contents as any[];
      const titles = contents.slice(0, 5).map((c: any) => c.header.contents[0].text);
      expect(titles).toEqual([
        "ご利用の流れ",
        "再処方について",
        "お支払い",
        "配送・お届け",
        "お困りの方へ",
      ]);
    });

    it("処方後版の「ご利用の流れ」カードは再処方関連の内容を含む", () => {
      const result = buildPostPrescriptionQaCarouselFlex();
      const contents = result.contents as any[];
      const firstCardBody = contents[0].body.contents;
      // 最初のアイテムのテキストを確認
      const texts = firstCardBody.map((item: any) => item.contents[1].text);
      expect(texts.some((t: string) => t.includes("再処方"))).toBe(true);
    });
  });

  describe("「すべて見る」バブル", () => {
    it("最後のバブルに「すべてのQ&Aを見る」テキストがある", () => {
      const result = buildQaCarouselFlex();
      const contents = result.contents as any[];
      const lastBubble = contents[contents.length - 1];
      const bodyTexts = lastBubble.body.contents.map((c: any) => c.text || c.contents?.map((cc: any) => cc.text).join("")).filter(Boolean);
      expect(bodyTexts.some((t: string) => t.includes("すべてのQ&Aを見る"))).toBe(true);
    });

    it("「Q&Aページを開く」ボタンがある", () => {
      const result = buildQaCarouselFlex();
      const contents = result.contents as any[];
      const lastBubble = contents[contents.length - 1];
      const button = lastBubble.footer.contents[0];
      expect(button.action.label).toBe("Q&Aページを開く");
      expect(button.action.type).toBe("uri");
    });
  });

  describe("altText", () => {
    it("通常版のaltTextにQ&A関連文言が含まれる", () => {
      expect(QA_CAROUSEL_ALT_TEXT).toContain("よくある質問");
      expect(QA_CAROUSEL_ALT_TEXT).toContain("ご利用の流れ");
    });

    it("処方後版のaltTextに再処方が含まれる", () => {
      expect(QA_CAROUSEL_POST_ALT_TEXT).toContain("再処方");
    });
  });
});
