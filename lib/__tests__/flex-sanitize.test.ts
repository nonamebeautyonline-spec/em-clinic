// lib/__tests__/flex-sanitize.test.ts
// LINE Flex Messageサニタイズのテスト
import { describe, it, expect } from "vitest";
import {
  fixInvalidProps,
  sanitizeFlexContainer,
  sanitizeFlexContents,
} from "@/lib/flex-sanitize";

describe("fixInvalidProps", () => {
  it("marginTopをmarginにリネームする", () => {
    const input = { type: "box", marginTop: "md" };
    const result = fixInvalidProps(input) as Record<string, unknown>;
    expect(result.margin).toBe("md");
    expect(result.marginTop).toBeUndefined();
  });

  it("marginBottomをmarginにリネームする", () => {
    const input = { type: "text", marginBottom: "lg" };
    const result = fixInvalidProps(input) as Record<string, unknown>;
    expect(result.margin).toBe("lg");
  });

  it("有効なプロパティはそのまま残す", () => {
    const input = { type: "text", text: "hello", size: "md" };
    const result = fixInvalidProps(input) as Record<string, unknown>;
    expect(result).toEqual(input);
  });

  it("ネストされたオブジェクトも再帰的に処理する", () => {
    const input = {
      type: "box",
      contents: [{ type: "text", marginTop: "sm" }],
    };
    const result = fixInvalidProps(input) as any;
    expect(result.contents[0].margin).toBe("sm");
  });

  it("nullやプリミティブはそのまま返す", () => {
    expect(fixInvalidProps(null)).toBeNull();
    expect(fixInvalidProps("text")).toBe("text");
    expect(fixInvalidProps(42)).toBe(42);
  });
});

describe("sanitizeFlexContainer", () => {
  it("bubbleコンテナの不明プロパティを除去する", () => {
    const input = {
      type: "bubble",
      body: { type: "box" },
      unknownProp: "xxx",
      anotherBad: 123,
    };
    const result = sanitizeFlexContainer(input) as Record<string, unknown>;
    expect(result.type).toBe("bubble");
    expect(result.body).toBeDefined();
    expect(result.unknownProp).toBeUndefined();
    expect(result.anotherBad).toBeUndefined();
  });

  it("typeがなくてもbodyがあればbubbleとして扱う", () => {
    const input = { body: { type: "box", contents: [] } };
    const result = sanitizeFlexContainer(input) as Record<string, unknown>;
    expect(result.type).toBe("bubble");
  });

  it("配列を渡すとcarouselにラップする", () => {
    const input = [
      { type: "bubble", body: { type: "box" } },
      { type: "bubble", body: { type: "box" } },
    ];
    const result = sanitizeFlexContainer(input) as any;
    expect(result.type).toBe("carousel");
    expect(result.contents).toHaveLength(2);
  });

  it("単一要素の配列はバブルとして取り出す", () => {
    const input = [{ type: "bubble", body: { type: "box" } }];
    const result = sanitizeFlexContainer(input) as any;
    expect(result.type).toBe("bubble");
  });

  it("type:flexのcontentsをアンラップする", () => {
    const input = {
      type: "flex",
      contents: { type: "bubble", body: { type: "box" } },
    };
    const result = sanitizeFlexContainer(input) as any;
    expect(result.type).toBe("bubble");
  });

  it("carouselのcontentsを再帰処理する", () => {
    const input = {
      type: "carousel",
      contents: [
        { type: "bubble", body: { type: "box" }, bad: "x" },
      ],
    };
    const result = sanitizeFlexContainer(input) as any;
    expect(result.contents[0].bad).toBeUndefined();
    expect(result.contents[0].type).toBe("bubble");
  });

  it("深さ制限（depth>5）でそのまま返す", () => {
    const input = { type: "bubble", body: {} };
    const result = sanitizeFlexContainer(input, 6);
    expect(result).toBe(input);
  });

  it("nullはそのまま返す", () => {
    expect(sanitizeFlexContainer(null)).toBeNull();
  });
});

describe("sanitizeFlexContents", () => {
  it("fixInvalidPropsとsanitizeFlexContainerを一括適用する", () => {
    const input = {
      type: "bubble",
      body: { type: "box", marginTop: "md", contents: [] },
      invalidProp: "x",
    };
    const result = sanitizeFlexContents(input) as any;
    expect(result.type).toBe("bubble");
    expect(result.invalidProp).toBeUndefined();
    // body内のmarginTopはmarginに変換されている（bodyはbubble許可プロパティなのでそのまま残る）
    expect(result.body.margin).toBe("md");
  });

  it("配列が残った場合はcarousel化する", () => {
    // sanitizeFlexContainer内で配列→carouselされるが、念のためのフォールバック
    const input = [
      { type: "bubble", body: {} },
      { type: "bubble", body: {} },
    ];
    const result = sanitizeFlexContents(input) as any;
    expect(result.type).toBe("carousel");
  });
});
