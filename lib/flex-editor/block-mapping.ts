// lib/flex-editor/block-mapping.ts
// Flex JSON ↔ ブロック（EditorBlock）相互変換

import {
  type BlockType,
  type EditorBlock,
  type Panel,
  type PanelSettings,
  type BlockAction,
  DEFAULT_PANEL_SETTINGS,
  generateBlockId,
} from "./block-types";

type FlexObj = Record<string, unknown>;

// ────────────────────────────────────────
// Flex JSON → ブロック変換（読込時）
// ────────────────────────────────────────

/** Flex JSON要素をブロックタイプに分類 */
function classifyFlexElement(el: FlexObj): BlockType {
  const type = el.type as string;
  if (type === "image") return "image";
  if (type === "button") return "button";
  if (type === "separator") return "separator";
  if (type === "text") {
    const weight = el.weight as string;
    const size = el.size as string;
    if (weight === "bold" && ["xl", "lg", "xxl", "3xl", "4xl", "5xl"].includes(size)) {
      return "title";
    }
    return "text";
  }
  return "text"; // フォールバック
}

/** Flex actionオブジェクトをBlockActionに変換 */
function flexActionToBlockAction(action: FlexObj | undefined): BlockAction | undefined {
  if (!action) return undefined;
  const type = action.type as string;
  if (type === "uri") {
    return { type: "url", value: (action.uri as string) || "", label: action.label as string };
  }
  if (type === "message") {
    return { type: "message", value: (action.text as string) || "", label: action.label as string };
  }
  if (type === "postback") {
    return { type: "message", value: (action.data as string) || "", label: action.label as string };
  }
  return undefined;
}

/** Flex JSON要素1つをEditorBlockに変換 */
function flexElementToBlock(el: FlexObj): EditorBlock {
  const blockType = classifyFlexElement(el);

  switch (blockType) {
    case "title":
      return {
        id: generateBlockId(),
        props: { blockType: "title", text: (el.text as string) || "" },
      };
    case "text": {
      const color = el.color as string | undefined;
      const size = el.size as string | undefined;
      return {
        id: generateBlockId(),
        props: {
          blockType: "text",
          text: (el.text as string) || "",
          wrap: el.wrap !== false,
          ...(color && color !== "#666666" && color !== "#111111" ? { color } : {}),
          ...(size && size !== "md" ? { size } : {}),
        },
      };
    }
    case "image":
      return {
        id: generateBlockId(),
        props: {
          blockType: "image",
          url: (el.url as string) || "",
          aspectRatio: (el.aspectRatio as string) || "20:13",
          action: flexActionToBlockAction(el.action as FlexObj),
        },
      };
    case "button": {
      const action = (el.action || {}) as FlexObj;
      return {
        id: generateBlockId(),
        props: {
          blockType: "button",
          label: (action.label as string) || "ボタン",
          style: (el.style as "primary" | "secondary" | "link") || "primary",
          color: (el.color as string) || "#06C755",
          action: flexActionToBlockAction(action) || { type: "url", value: "" },
        },
      };
    }
    case "separator":
      return {
        id: generateBlockId(),
        props: { blockType: "separator" },
      };
  }
}

/** バレット記号パターン */
const BULLET_CHARS = /^[●・▶★◆■□◇▷►☆✓✔⚫︎○◎▪▸•]$/;

/** horizontal/baseline boxが●+テキストのパターンか判定 */
function isBulletTextBox(box: FlexObj): boolean {
  const layout = box.layout as string;
  if (layout !== "horizontal" && layout !== "baseline") return false;
  const contents = (box.contents || []) as FlexObj[];
  if (contents.length !== 2) return false;
  const first = contents[0];
  const second = contents[1];
  if (first.type !== "text" || second.type !== "text") return false;
  const firstText = (first.text as string) || "";
  // バレット記号 + 後続テキスト
  return BULLET_CHARS.test(firstText) && ((second.text as string) || "").length > 0;
}

/** ●+テキストパターンを1つのテキストブロックに統合 */
function mergeBulletTextBox(box: FlexObj): EditorBlock {
  const contents = (box.contents || []) as FlexObj[];
  const bullet = contents[0];
  const text = contents[1];
  const bulletText = (bullet.text as string) || "";
  const mainText = (text.text as string) || "";
  const color = (bullet.color || text.color) as string | undefined;
  const size = (text.size || bullet.size) as string | undefined;
  return {
    id: generateBlockId(),
    props: {
      blockType: "text",
      text: `${bulletText} ${mainText}`,
      wrap: text.wrap !== false,
      ...(color && color !== "#666666" && color !== "#111111" ? { color } : {}),
      ...(size && size !== "md" ? { size } : {}),
    },
  };
}

/** box内のcontentsを再帰的にフラットなブロック列に展開 */
function flattenBoxContents(box: FlexObj): EditorBlock[] {
  const contents = (box.contents || []) as FlexObj[];
  const blocks: EditorBlock[] = [];
  for (let i = 0; i < contents.length; i++) {
    const item = contents[i];
    const type = item.type as string;
    if (type === "box") {
      if (isBulletTextBox(item)) {
        // horizontal boxの●+テキストパターン → 1ブロックに統合
        blocks.push(mergeBulletTextBox(item));
      } else {
        // ネストboxは展開
        blocks.push(...flattenBoxContents(item));
      }
    } else if (type === "filler" || type === "spacer") {
      // filler/spacerはブロック変換不要（装飾用）→ スキップ
    } else if (type === "text") {
      const text = (item.text as string) || "";
      const next = contents[i + 1];
      // vertical box内の●+次テキストパターンを検出
      if (BULLET_CHARS.test(text) && next && next.type === "text" && ((next.text as string) || "").length > 0) {
        const color = (item.color || next.color) as string | undefined;
        const size = (next.size || item.size) as string | undefined;
        blocks.push({
          id: generateBlockId(),
          props: {
            blockType: "text",
            text: `${text} ${(next.text as string) || ""}`,
            wrap: next.wrap !== false,
            ...(color && color !== "#666666" && color !== "#111111" ? { color } : {}),
            ...(size && size !== "md" ? { size } : {}),
          },
        });
        i++; // 次の要素はスキップ（統合済み）
      } else {
        blocks.push(flexElementToBlock(item));
      }
    } else {
      blocks.push(flexElementToBlock(item));
    }
  }
  return blocks;
}

/** bubble全体からPanelに変換 */
export function bubbleToPanel(bubble: FlexObj): Panel {
  const blocks: EditorBlock[] = [];

  // headerセクション → タイトルブロック
  const header = bubble.header as FlexObj | undefined;
  if (header) {
    blocks.push(...flattenBoxContents(header));
  }

  // heroセクション → 画像ブロック
  const hero = bubble.hero as FlexObj | undefined;
  if (hero && hero.type === "image") {
    blocks.push(flexElementToBlock(hero));
  }

  // bodyセクション → メインブロック群
  const body = bubble.body as FlexObj | undefined;
  if (body) {
    blocks.push(...flattenBoxContents(body));
  }

  // footerセクション → ボタン等
  const footer = bubble.footer as FlexObj | undefined;
  if (footer) {
    blocks.push(...flattenBoxContents(footer));
  }

  // パネル設定を抽出（headerの背景色をthemeColorとして使用）
  const bodyBg = body?.backgroundColor as string;
  const headerBg = header?.backgroundColor as string;
  const settings: PanelSettings = {
    backgroundColor: bodyBg || DEFAULT_PANEL_SETTINGS.backgroundColor,
    themeColor: headerBg || extractThemeColor(blocks) || DEFAULT_PANEL_SETTINGS.themeColor,
    size: (bubble.size as PanelSettings["size"]) || DEFAULT_PANEL_SETTINGS.size,
  };

  return {
    id: generateBlockId(),
    settings,
    blocks,
  };
}

/** ブロック列からテーマカラーを推定（最初のボタンの色を使用） */
function extractThemeColor(blocks: EditorBlock[]): string | null {
  for (const block of blocks) {
    if (block.props.blockType === "button") {
      return block.props.color;
    }
  }
  return null;
}

/** Flex JSON全体をPanel配列に変換 */
export function flexToEditorPanels(flexData: FlexObj): Panel[] {
  const type = flexData.type as string;

  if (type === "carousel") {
    const contents = (flexData.contents || []) as FlexObj[];
    return contents.map((b) => bubbleToPanel(b));
  }

  if (type === "bubble" || flexData.body || flexData.header || flexData.hero) {
    return [bubbleToPanel(flexData)];
  }

  // フォールバック: 空パネル
  return [createEmptyPanel()];
}

// ────────────────────────────────────────
// ブロック → Flex JSON変換（保存時）
// ────────────────────────────────────────

/** BlockActionをFlex JSON actionに変換 */
function blockActionToFlex(action: BlockAction): FlexObj {
  if (action.type === "url") {
    return { type: "uri", label: action.label || "ボタン", uri: action.value || "https://example.com" };
  }
  return { type: "message", label: action.label || "メッセージ", text: action.value || "テキスト" };
}

/** EditorBlock 1つをFlex JSON要素に変換 */
function blockToFlexElement(block: EditorBlock): FlexObj {
  const { props } = block;

  switch (props.blockType) {
    case "title":
      return {
        type: "text",
        text: props.text || "タイトル",
        weight: "bold",
        size: "xl",
        wrap: true,
      };
    case "text":
      return {
        type: "text",
        text: props.text || "テキスト",
        size: props.size || "md",
        color: props.color || "#666666",
        wrap: props.wrap,
      };
    case "image":
      return {
        type: "image",
        url: props.url || "https://via.placeholder.com/600x400/e2e8f0/94a3b8?text=Image",
        aspectRatio: props.aspectRatio || "20:13",
        size: "full",
        aspectMode: "cover",
        ...(props.action ? { action: blockActionToFlex(props.action) } : {}),
      };
    case "button":
      return {
        type: "button",
        style: props.style || "primary",
        color: props.color || "#06C755",
        action: blockActionToFlex({ ...props.action, label: props.label }),
      };
    case "separator":
      return {
        type: "separator",
        margin: "md",
      };
  }
}

/** テキストが●/・/▶等のバレット付きかチェックし、horizontal boxに変換 */
function textToFlexWithBullet(block: EditorBlock): FlexObj | null {
  if (block.props.blockType !== "text") return null;
  const text = block.props.text;
  // ●/・/▶/★ + 半角スペース + 残りテキスト のパターンを検出
  const match = text.match(/^([●・▶★◆■□◇▷►☆✓✔︎⚫︎])\s([\s\S]+)$/);
  if (!match) return null;
  const [, bullet, mainText] = match;
  const color = block.props.color;
  const size = block.props.size || "md";
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: [
      { type: "text", text: bullet, flex: 0, size, ...(color ? { color } : {}) },
      { type: "text", text: mainText, flex: 5, size, wrap: block.props.wrap, color: color || "#666666" },
    ],
  };
}

/** Panel → Flex JSON bubbleに変換 */
export function panelToBubble(panel: Panel): FlexObj {
  // ブロックをheader / body / footerに振り分け
  const headerBlocks: EditorBlock[] = [];
  const bodyBlocks: EditorBlock[] = [];
  const footerBlocks: EditorBlock[] = [];

  let inHeader = true;
  for (const block of panel.blocks) {
    if (inHeader && (block.props.blockType === "title" || (block.props.blockType === "text" && headerBlocks.length > 0 && headerBlocks.length < 2))) {
      headerBlocks.push(block);
    } else {
      inHeader = false;
      if (block.props.blockType === "button") {
        footerBlocks.push(block);
      } else {
        bodyBlocks.push(block);
      }
    }
  }

  // bodyBlocksのbulletパターンをhorizontal boxに変換
  const bodyContents = bodyBlocks.map((b) => textToFlexWithBullet(b) || blockToFlexElement(b));
  const footerContents = footerBlocks.map(blockToFlexElement);

  const bubble: FlexObj = {
    type: "bubble",
    size: panel.settings.size,
  };

  // header: タイトル＋サブタイトル（themeColor背景）
  if (headerBlocks.length > 0) {
    const headerContents = headerBlocks.map((b) => {
      const el = blockToFlexElement(b);
      // header内テキストは白文字
      if (b.props.blockType === "title") return { ...el, color: "#ffffff" };
      if (b.props.blockType === "text") return { ...el, color: "#ffffffcc", size: "sm" };
      return el;
    });
    bubble.header = {
      type: "box",
      layout: "vertical",
      contents: headerContents,
      backgroundColor: panel.settings.themeColor,
      paddingAll: "20px",
    };
  }

  // body
  if (bodyContents.length > 0) {
    bubble.body = {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
      spacing: "md",
      ...(panel.settings.backgroundColor !== "#ffffff"
        ? { backgroundColor: panel.settings.backgroundColor }
        : {}),
    };
  }

  // footer
  if (footerContents.length > 0) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      contents: footerContents,
      spacing: "sm",
    };
  }

  return bubble;
}

/** Panel配列 → Flex JSON（bubble or carousel）に変換 */
export function editorPanelsToFlex(panels: Panel[]): FlexObj {
  if (panels.length === 0) {
    return panelToBubble(createEmptyPanel());
  }

  if (panels.length === 1) {
    return panelToBubble(panels[0]);
  }

  return {
    type: "carousel",
    contents: panels.map(panelToBubble),
  };
}

// ────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────

/** 空のパネルを作成 */
export function createEmptyPanel(themeColor?: string): Panel {
  return {
    id: generateBlockId(),
    settings: {
      ...DEFAULT_PANEL_SETTINGS,
      ...(themeColor ? { themeColor } : {}),
    },
    blocks: [],
  };
}

/** パネルを複製（IDは再生成） */
export function duplicatePanel(panel: Panel): Panel {
  return {
    id: generateBlockId(),
    settings: { ...panel.settings },
    blocks: panel.blocks.map((b) => ({
      id: generateBlockId(),
      props: { ...b.props },
    })),
  };
}
