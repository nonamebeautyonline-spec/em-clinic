// lib/flex-editor/block-types.ts
// ブロックエディタの型定義 + デフォルト値

/** ブロックタイプ */
export type BlockType = "title" | "text" | "image" | "button" | "separator";

/** アクション設定 */
export interface BlockAction {
  type: "url" | "message";
  value: string;
  label?: string;
}

/** 各ブロックのプロパティ型 */
export interface TitleBlockProps {
  text: string;
  subtitle?: string;
}

export interface TextBlockProps {
  text: string;
  wrap: boolean;
}

export interface ImageBlockProps {
  url: string;
  aspectRatio: string;
  action?: BlockAction;
}

export interface ButtonBlockProps {
  label: string;
  style: "primary" | "secondary" | "link";
  color: string;
  action: BlockAction;
}

export interface SeparatorBlockProps {
  // 設定項目なし（シンプル）
}

export type BlockProps =
  | ({ blockType: "title" } & TitleBlockProps)
  | ({ blockType: "text" } & TextBlockProps)
  | ({ blockType: "image" } & ImageBlockProps)
  | ({ blockType: "button" } & ButtonBlockProps)
  | ({ blockType: "separator" } & SeparatorBlockProps);

/** エディタ上のブロック */
export interface EditorBlock {
  id: string;
  props: BlockProps;
}

/** パネル設定 */
export interface PanelSettings {
  backgroundColor: string;
  themeColor: string;
  size: "kilo" | "mega" | "giga";
}

/** パネル（= Flex bubble） */
export interface Panel {
  id: string;
  settings: PanelSettings;
  blocks: EditorBlock[];
}

/** デフォルトパネル設定 */
export const DEFAULT_PANEL_SETTINGS: PanelSettings = {
  backgroundColor: "#ffffff",
  themeColor: "#06C755",
  size: "mega",
};

/** ブロックタイプ別の日本語ラベル */
export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  title: "タイトル",
  text: "テキスト",
  image: "画像",
  button: "ボタン",
  separator: "区切り線",
};

/** ブロック追加メニュー用アイコン */
export const BLOCK_TYPE_ICONS: Record<BlockType, string> = {
  title: "Aa",
  text: "T",
  image: "🖼",
  button: "▢",
  separator: "—",
};

/** 新規ブロック作成時のデフォルトProps */
export function createDefaultBlockProps(blockType: BlockType, themeColor: string): BlockProps {
  switch (blockType) {
    case "title":
      return { blockType: "title", text: "" };
    case "text":
      return { blockType: "text", text: "", wrap: true };
    case "image":
      return { blockType: "image", url: "", aspectRatio: "20:13" };
    case "button":
      return {
        blockType: "button",
        label: "ボタン",
        style: "primary",
        color: themeColor,
        action: { type: "url", value: "" },
      };
    case "separator":
      return { blockType: "separator" };
  }
}

/** テーマカラーのプリセット */
export const THEME_COLOR_PRESETS = [
  { value: "#06C755", label: "グリーン" },
  { value: "#4285F4", label: "ブルー" },
  { value: "#EA4335", label: "レッド" },
  { value: "#FF9800", label: "オレンジ" },
];

/** 背景色のプリセット */
export const BG_COLOR_PRESETS = [
  { value: "#ffffff", label: "白" },
  { value: "#f5f5f5", label: "ライトグレー" },
];

/** サイズ選択肢 */
export const PANEL_SIZE_OPTIONS = [
  { value: "kilo" as const, label: "コンパクト" },
  { value: "mega" as const, label: "標準" },
  { value: "giga" as const, label: "大" },
];

/** アスペクト比の選択肢 */
export const ASPECT_RATIO_OPTIONS = [
  { value: "1:1", label: "正方形" },
  { value: "4:3", label: "4:3" },
  { value: "20:13", label: "20:13" },
  { value: "2:1", label: "横長" },
  { value: "3:1", label: "バナー" },
];

/** 一意ID生成 */
export function generateBlockId(): string {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
