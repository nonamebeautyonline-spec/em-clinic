// lib/flex-editor/element-defaults.ts
// Flex Message各要素タイプのデフォルト値

export const ELEMENT_DEFAULTS: Record<string, Record<string, unknown>> = {
  text: {
    type: "text",
    text: "テキスト",
    size: "md",
    color: "#111111",
    wrap: true,
  },
  button: {
    type: "button",
    style: "primary",
    color: "#06C755",
    action: { type: "uri", label: "ボタン", uri: "https://example.com" },
  },
  image: {
    type: "image",
    url: "https://via.placeholder.com/600x400/e2e8f0/94a3b8?text=Image",
    aspectRatio: "20:13",
    size: "full",
    aspectMode: "cover",
  },
  separator: {
    type: "separator",
    margin: "md",
  },
  box: {
    type: "box",
    layout: "vertical",
    contents: [],
    spacing: "sm",
  },
};

/** 空のバブルを生成 */
export function createEmptyBubble(): Record<string, unknown> {
  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "タイトル", weight: "bold", size: "lg", wrap: true },
        { type: "text", text: "説明文を入力してください", size: "sm", color: "#666666", wrap: true, margin: "md" },
      ],
      spacing: "sm",
    },
  };
}

/** 空のカルーセルを生成 */
export function createEmptyCarousel(): Record<string, unknown> {
  return {
    type: "carousel",
    contents: [createEmptyBubble()],
  };
}

/** 要素タイプの日本語ラベル */
export const ELEMENT_TYPE_LABELS: Record<string, string> = {
  text: "テキスト",
  button: "ボタン",
  image: "画像",
  separator: "区切り線",
  box: "ボックス",
  bubble: "バブル",
  carousel: "カルーセル",
};

/** Flexサイズ選択肢 */
export const FLEX_SIZES = [
  { value: "xxs", label: "XXS" },
  { value: "xs", label: "XS" },
  { value: "sm", label: "S" },
  { value: "md", label: "M" },
  { value: "lg", label: "L" },
  { value: "xl", label: "XL" },
  { value: "xxl", label: "XXL" },
];

/** バブルサイズ選択肢 */
export const BUBBLE_SIZES = [
  { value: "nano", label: "Nano" },
  { value: "micro", label: "Micro" },
  { value: "deca", label: "Deca" },
  { value: "hecto", label: "Hecto" },
  { value: "kilo", label: "Kilo" },
  { value: "mega", label: "Mega" },
  { value: "giga", label: "Giga" },
];

/** マージン選択肢 */
export const MARGIN_OPTIONS = [
  { value: "none", label: "なし" },
  { value: "xs", label: "XS" },
  { value: "sm", label: "S" },
  { value: "md", label: "M" },
  { value: "lg", label: "L" },
  { value: "xl", label: "XL" },
  { value: "xxl", label: "XXL" },
];

/** アクションタイプ選択肢 */
export const ACTION_TYPES = [
  { value: "uri", label: "URL" },
  { value: "postback", label: "ポストバック" },
  { value: "message", label: "メッセージ" },
];

/** ボタンスタイル選択肢 */
export const BUTTON_STYLES = [
  { value: "primary", label: "プライマリ" },
  { value: "secondary", label: "セカンダリ" },
  { value: "link", label: "リンク" },
];

/** レイアウト選択肢 */
export const LAYOUT_OPTIONS = [
  { value: "vertical", label: "縦並び" },
  { value: "horizontal", label: "横並び" },
  { value: "baseline", label: "ベースライン" },
];

/** アスペクト比選択肢 */
export const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1（正方形）" },
  { value: "1.51:1", label: "1.51:1" },
  { value: "1.91:1", label: "1.91:1" },
  { value: "4:3", label: "4:3" },
  { value: "20:13", label: "20:13" },
  { value: "2:1", label: "2:1" },
  { value: "3:1", label: "3:1" },
];
