import { describe, it, expect } from "vitest";
import {
  flexToEditorPanels,
  editorPanelsToFlex,
  bubbleToPanel,
  panelToBubble,
  createEmptyPanel,
  duplicatePanel,
} from "../block-mapping";
import type { Panel, EditorBlock } from "../block-types";
import { generateBlockId } from "../block-types";

// ── Flex JSON → ブロック変換 ──

describe("flexToEditorPanels", () => {
  it("単一bubbleをPanel 1つに変換", () => {
    const bubble = {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "こんにちは", weight: "bold", size: "xl" },
          { type: "text", text: "説明文", size: "md", wrap: true },
        ],
      },
    };

    const panels = flexToEditorPanels(bubble);
    expect(panels).toHaveLength(1);
    expect(panels[0].blocks).toHaveLength(2);
    expect(panels[0].blocks[0].props.blockType).toBe("title");
    expect(panels[0].blocks[1].props.blockType).toBe("text");
    expect(panels[0].settings.size).toBe("mega");
  });

  it("carouselを複数Panelに変換", () => {
    const carousel = {
      type: "carousel",
      contents: [
        {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [{ type: "text", text: "パネル1", weight: "bold", size: "xl" }],
          },
        },
        {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [{ type: "text", text: "パネル2", weight: "bold", size: "lg" }],
          },
        },
      ],
    };

    const panels = flexToEditorPanels(carousel);
    expect(panels).toHaveLength(2);
    expect(panels[0].blocks[0].props.blockType).toBe("title");
    expect(panels[1].blocks[0].props.blockType).toBe("title");
  });

  it("header/hero/body/footerを統合してブロック列にする", () => {
    const bubble = {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [{ type: "text", text: "ヘッダー", weight: "bold", size: "lg", color: "#ffffff" }],
        backgroundColor: "#06C755",
      },
      hero: {
        type: "image",
        url: "https://example.com/image.jpg",
        aspectRatio: "2:1",
        size: "full",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "本文", size: "md", wrap: true },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "button", style: "primary", color: "#06C755", action: { type: "uri", label: "詳細", uri: "https://example.com" } },
        ],
      },
    };

    const panels = flexToEditorPanels(bubble);
    const blocks = panels[0].blocks;
    expect(blocks).toHaveLength(4);
    expect(blocks[0].props.blockType).toBe("title"); // header text (bold + lg)
    expect(blocks[1].props.blockType).toBe("image"); // hero
    expect(blocks[2].props.blockType).toBe("text");  // body text
    expect(blocks[3].props.blockType).toBe("button"); // footer button
  });

  it("ネストしたboxをフラットに展開", () => {
    const bubble = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "左", size: "md" },
              { type: "text", text: "右", size: "md" },
            ],
          },
          { type: "text", text: "下", size: "md" },
        ],
      },
    };

    const panels = flexToEditorPanels(bubble);
    // box内の2テキスト + 外の1テキスト = 3ブロック
    expect(panels[0].blocks).toHaveLength(3);
    expect(panels[0].blocks.every((b) => b.props.blockType === "text")).toBe(true);
  });

  it("不正なデータは空パネルを返す", () => {
    const panels = flexToEditorPanels({ type: "unknown" });
    expect(panels).toHaveLength(1);
    expect(panels[0].blocks).toHaveLength(0);
  });
});

// ── ブロック分類テスト ──

describe("bubbleToPanel: ブロックタイプ分類", () => {
  it("boldでxlのtextはtitleに分類", () => {
    const bubble = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [{ type: "text", text: "タイトル", weight: "bold", size: "xl" }],
      },
    };
    const panel = bubbleToPanel(bubble);
    expect(panel.blocks[0].props.blockType).toBe("title");
  });

  it("boldでxxlのtextもtitleに分類", () => {
    const bubble = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [{ type: "text", text: "大タイトル", weight: "bold", size: "xxl" }],
      },
    };
    const panel = bubbleToPanel(bubble);
    expect(panel.blocks[0].props.blockType).toBe("title");
  });

  it("boldでmdのtextはtextに分類（タイトルではない）", () => {
    const bubble = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [{ type: "text", text: "太字テキスト", weight: "bold", size: "md" }],
      },
    };
    const panel = bubbleToPanel(bubble);
    expect(panel.blocks[0].props.blockType).toBe("text");
  });

  it("buttonの各プロパティを正しく抽出", () => {
    const bubble = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [{
          type: "button",
          style: "secondary",
          color: "#4285F4",
          action: { type: "uri", label: "リンク", uri: "https://example.com" },
        }],
      },
    };
    const panel = bubbleToPanel(bubble);
    const btn = panel.blocks[0];
    expect(btn.props.blockType).toBe("button");
    if (btn.props.blockType === "button") {
      expect(btn.props.style).toBe("secondary");
      expect(btn.props.color).toBe("#4285F4");
      expect(btn.props.label).toBe("リンク");
      expect(btn.props.action.type).toBe("url");
      expect(btn.props.action.value).toBe("https://example.com");
    }
  });

  it("imageのプロパティを正しく抽出", () => {
    const bubble = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [{
          type: "image",
          url: "https://example.com/img.png",
          aspectRatio: "4:3",
          action: { type: "uri", label: "開く", uri: "https://example.com" },
        }],
      },
    };
    const panel = bubbleToPanel(bubble);
    const img = panel.blocks[0];
    expect(img.props.blockType).toBe("image");
    if (img.props.blockType === "image") {
      expect(img.props.url).toBe("https://example.com/img.png");
      expect(img.props.aspectRatio).toBe("4:3");
      expect(img.props.action?.type).toBe("url");
    }
  });

  it("separatorを正しく分類", () => {
    const bubble = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [{ type: "separator", margin: "md" }],
      },
    };
    const panel = bubbleToPanel(bubble);
    expect(panel.blocks[0].props.blockType).toBe("separator");
  });
});

// ── パネル設定の抽出 ──

describe("bubbleToPanel: パネル設定", () => {
  it("body.backgroundColorをパネル背景色に反映", () => {
    const bubble = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [],
        backgroundColor: "#f5f5f5",
      },
    };
    const panel = bubbleToPanel(bubble);
    expect(panel.settings.backgroundColor).toBe("#f5f5f5");
  });

  it("bubble.sizeをパネルサイズに反映", () => {
    const bubble = {
      type: "bubble",
      size: "kilo",
      body: { type: "box", layout: "vertical", contents: [] },
    };
    const panel = bubbleToPanel(bubble);
    expect(panel.settings.size).toBe("kilo");
  });

  it("最初のボタンの色をテーマカラーとして抽出", () => {
    const bubble = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "テスト", size: "md" },
          { type: "button", style: "primary", color: "#EA4335", action: { type: "uri", label: "ボタン", uri: "" } },
        ],
      },
    };
    const panel = bubbleToPanel(bubble);
    expect(panel.settings.themeColor).toBe("#EA4335");
  });
});

// ── ブロック → Flex JSON変換 ──

describe("panelToBubble", () => {
  it("空パネルを有効なbubbleに変換", () => {
    const panel = createEmptyPanel();
    const bubble = panelToBubble(panel);
    expect(bubble.type).toBe("bubble");
    expect(bubble.size).toBe("mega");
    // 空パネルはheader/body/footerなし
    expect(bubble.header).toBeUndefined();
    expect(bubble.body).toBeUndefined();
    expect(bubble.footer).toBeUndefined();
  });

  it("タイトルブロックをheaderに配置", () => {
    const panel: Panel = {
      id: "p1",
      settings: { ...createEmptyPanel().settings },
      blocks: [{
        id: "b1",
        props: { blockType: "title", text: "テストタイトル" },
      }],
    };
    const bubble = panelToBubble(panel);
    // タイトルはheaderに入る
    const header = bubble.header as Record<string, unknown>;
    expect(header).toBeTruthy();
    const contents = header.contents as Record<string, unknown>[];
    expect(contents[0]).toMatchObject({
      type: "text",
      text: "テストタイトル",
      weight: "bold",
      size: "xl",
    });
  });

  it("テキストブロックをbodyに配置", () => {
    const panel: Panel = {
      id: "p1",
      settings: { ...createEmptyPanel().settings },
      blocks: [{
        id: "b1",
        props: { blockType: "text", text: "説明文です", wrap: true },
      }],
    };
    const bubble = panelToBubble(panel);
    // テキストのみの場合、headerはなくbodyに入る
    const body = bubble.body as Record<string, unknown>;
    const contents = body.contents as Record<string, unknown>[];
    expect(contents[0]).toMatchObject({
      type: "text",
      text: "説明文です",
      size: "md",
      wrap: true,
    });
  });

  it("ボタンブロックをfooterに配置", () => {
    const panel: Panel = {
      id: "p1",
      settings: { ...createEmptyPanel().settings },
      blocks: [{
        id: "b1",
        props: {
          blockType: "button",
          label: "詳しく見る",
          style: "primary",
          color: "#06C755",
          action: { type: "url", value: "https://example.com" },
        },
      }],
    };
    const bubble = panelToBubble(panel);
    // ボタンはfooterに入る
    const footer = bubble.footer as Record<string, unknown>;
    expect(footer).toBeTruthy();
    const contents = footer.contents as Record<string, unknown>[];
    expect(contents[0]).toMatchObject({
      type: "button",
      style: "primary",
      color: "#06C755",
    });
    const action = (contents[0] as Record<string, unknown>).action as Record<string, unknown>;
    expect(action.type).toBe("uri");
    expect(action.label).toBe("詳しく見る");
    expect(action.uri).toBe("https://example.com");
  });

  it("画像ブロックをimageに変換", () => {
    const panel: Panel = {
      id: "p1",
      settings: { ...createEmptyPanel().settings },
      blocks: [{
        id: "b1",
        props: { blockType: "image", url: "https://example.com/img.jpg", aspectRatio: "4:3" },
      }],
    };
    const bubble = panelToBubble(panel);
    const body = bubble.body as Record<string, unknown>;
    const contents = body.contents as Record<string, unknown>[];
    expect(contents[0]).toMatchObject({
      type: "image",
      url: "https://example.com/img.jpg",
      aspectRatio: "4:3",
      size: "full",
    });
  });

  it("背景色をbody.backgroundColorに反映", () => {
    const panel: Panel = {
      id: "p1",
      settings: { backgroundColor: "#f0f0f0", themeColor: "#06C755", size: "mega" },
      blocks: [{ id: "b1", props: { blockType: "text", text: "テスト", wrap: true } }],
    };
    const bubble = panelToBubble(panel);
    const body = bubble.body as Record<string, unknown>;
    expect(body.backgroundColor).toBe("#f0f0f0");
  });

  it("白背景の場合はbackgroundColorを省略", () => {
    const panel: Panel = {
      id: "p1",
      settings: { backgroundColor: "#ffffff", themeColor: "#06C755", size: "mega" },
      blocks: [{ id: "b1", props: { blockType: "text", text: "テスト", wrap: true } }],
    };
    const bubble = panelToBubble(panel);
    const body = bubble.body as Record<string, unknown>;
    expect(body.backgroundColor).toBeUndefined();
  });
});

// ── 往復変換テスト ──

describe("往復変換（Flex → ブロック → Flex）", () => {
  it("シンプルなbubbleが往復しても構造を維持", () => {
    const original = {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "タイトル", weight: "bold", size: "xl", wrap: true },
          { type: "text", text: "説明文", size: "md", color: "#666666", wrap: true },
          { type: "button", style: "primary", color: "#06C755", action: { type: "uri", label: "ボタン", uri: "https://example.com" } },
        ],
        spacing: "md",
      },
    };

    const panels = flexToEditorPanels(original);
    const result = editorPanelsToFlex(panels);

    expect(result.type).toBe("bubble");
    expect(result.size).toBe("mega");
    // タイトル+サブタイトルはheaderに、ボタンはfooterに振り分けられる
    const header = result.header as Record<string, unknown>;
    expect(header).toBeTruthy();
    const headerContents = header.contents as Record<string, unknown>[];
    expect(headerContents[0]).toMatchObject({ type: "text", weight: "bold", size: "xl" });
    expect(headerContents[1]).toMatchObject({ type: "text" }); // サブタイトル

    const footer = result.footer as Record<string, unknown>;
    const footerContents = footer.contents as Record<string, unknown>[];
    expect(footerContents[0]).toMatchObject({ type: "button", style: "primary" });
  });

  it("carouselの往復変換", () => {
    const original = {
      type: "carousel",
      contents: [
        {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [{ type: "text", text: "パネル1", weight: "bold", size: "xl" }],
          },
        },
        {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [{ type: "text", text: "パネル2", weight: "bold", size: "xl" }],
          },
        },
      ],
    };

    const panels = flexToEditorPanels(original);
    expect(panels).toHaveLength(2);

    const result = editorPanelsToFlex(panels);
    expect(result.type).toBe("carousel");
    expect((result.contents as unknown[]).length).toBe(2);
  });
});

// ── editorPanelsToFlex ──

describe("editorPanelsToFlex", () => {
  it("1パネルの場合はbubbleを返す", () => {
    const panels = [createEmptyPanel()];
    const result = editorPanelsToFlex(panels);
    expect(result.type).toBe("bubble");
  });

  it("2パネル以上の場合はcarouselを返す", () => {
    const panels = [createEmptyPanel(), createEmptyPanel()];
    const result = editorPanelsToFlex(panels);
    expect(result.type).toBe("carousel");
    expect((result.contents as unknown[]).length).toBe(2);
  });

  it("空配列の場合は空bubbleを返す", () => {
    const result = editorPanelsToFlex([]);
    expect(result.type).toBe("bubble");
  });
});

// ── ユーティリティ ──

describe("createEmptyPanel", () => {
  it("デフォルト設定でパネルを作成", () => {
    const panel = createEmptyPanel();
    expect(panel.settings.backgroundColor).toBe("#ffffff");
    expect(panel.settings.themeColor).toBe("#06C755");
    expect(panel.settings.size).toBe("mega");
    expect(panel.blocks).toHaveLength(0);
    expect(panel.id).toBeTruthy();
  });

  it("テーマカラー指定でパネルを作成", () => {
    const panel = createEmptyPanel("#EA4335");
    expect(panel.settings.themeColor).toBe("#EA4335");
  });
});

describe("duplicatePanel", () => {
  it("IDが異なるコピーを作成", () => {
    const original: Panel = {
      id: "original",
      settings: { backgroundColor: "#f5f5f5", themeColor: "#4285F4", size: "kilo" },
      blocks: [
        { id: "b1", props: { blockType: "title", text: "テスト" } },
        { id: "b2", props: { blockType: "text", text: "説明", wrap: true } },
      ],
    };

    const copy = duplicatePanel(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.settings).toEqual(original.settings);
    expect(copy.blocks).toHaveLength(2);
    expect(copy.blocks[0].id).not.toBe(original.blocks[0].id);
    expect(copy.blocks[0].props).toEqual(original.blocks[0].props);
  });
});
