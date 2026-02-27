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
    case "text":
      return {
        id: generateBlockId(),
        props: { blockType: "text", text: (el.text as string) || "", wrap: el.wrap !== false },
      };
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

/** box内のcontentsを再帰的にフラットなブロック列に展開 */
function flattenBoxContents(box: FlexObj): EditorBlock[] {
  const contents = (box.contents || []) as FlexObj[];
  const blocks: EditorBlock[] = [];
  for (const item of contents) {
    const type = item.type as string;
    if (type === "box") {
      // ネストboxは展開
      blocks.push(...flattenBoxContents(item));
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

  // パネル設定を抽出
  const bodyBg = body?.backgroundColor as string;
  const settings: PanelSettings = {
    backgroundColor: bodyBg || DEFAULT_PANEL_SETTINGS.backgroundColor,
    themeColor: extractThemeColor(blocks) || DEFAULT_PANEL_SETTINGS.themeColor,
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
        size: "md",
        color: "#666666",
        wrap: props.wrap,
        ...(props.wrap === false ? {} : {}),
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

/** Panel → Flex JSON bubbleに変換 */
export function panelToBubble(panel: Panel): FlexObj {
  const bodyContents = panel.blocks.map(blockToFlexElement);

  const bubble: FlexObj = {
    type: "bubble",
    size: panel.settings.size,
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
      spacing: "md",
      ...(panel.settings.backgroundColor !== "#ffffff"
        ? { backgroundColor: panel.settings.backgroundColor }
        : {}),
    },
  };

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
