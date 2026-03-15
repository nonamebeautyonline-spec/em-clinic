/**
 * LINE Imagemap メッセージ構築ユーティリティ
 *
 * LINE imagemap message は画像上の指定領域にアクション（URL遷移・メッセージ送信）を設定できる。
 * baseUrl は LINE が {baseUrl}/1040, {baseUrl}/700 等でアクセスする URL パターン。
 */

/* ---------- 型定義 ---------- */

export interface ImagemapArea {
  x: number;
  y: number;
  width: number;
  height: number;
  action: {
    type: "uri" | "message";
    value: string;
  };
}

export interface ImagemapData {
  baseSize: { width: number; height: number };
  layout: string;
  areas: ImagemapArea[];
}

/* ---------- レイアウトプリセット ---------- */

export type LayoutKey = "full" | "split_h" | "split_v" | "grid_4" | "cols_3" | "grid_6";

export interface LayoutPreset {
  key: LayoutKey;
  label: string;
  description: string;
  areas: { x: number; y: number; width: number; height: number }[];
}

/** 1040×1040ベースのレイアウトプリセット */
export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    key: "full",
    label: "全面",
    description: "画像全体を1つのリンクに",
    areas: [{ x: 0, y: 0, width: 1040, height: 1040 }],
  },
  {
    key: "split_h",
    label: "左右2分割",
    description: "左右に分けて2つのリンクを設定",
    areas: [
      { x: 0, y: 0, width: 520, height: 1040 },
      { x: 520, y: 0, width: 520, height: 1040 },
    ],
  },
  {
    key: "split_v",
    label: "上下2分割",
    description: "上下に分けて2つのリンクを設定",
    areas: [
      { x: 0, y: 0, width: 1040, height: 520 },
      { x: 0, y: 520, width: 1040, height: 520 },
    ],
  },
  {
    key: "grid_4",
    label: "4分割",
    description: "2×2のグリッドで4つのリンク",
    areas: [
      { x: 0, y: 0, width: 520, height: 520 },
      { x: 520, y: 0, width: 520, height: 520 },
      { x: 0, y: 520, width: 520, height: 520 },
      { x: 520, y: 520, width: 520, height: 520 },
    ],
  },
  {
    key: "cols_3",
    label: "3列分割",
    description: "横3列に分けて3つのリンク",
    areas: [
      { x: 0, y: 0, width: 347, height: 1040 },
      { x: 347, y: 0, width: 347, height: 1040 },
      { x: 694, y: 0, width: 346, height: 1040 },
    ],
  },
  {
    key: "grid_6",
    label: "6分割",
    description: "2×3のグリッドで6つのリンク",
    areas: [
      { x: 0, y: 0, width: 347, height: 520 },
      { x: 347, y: 0, width: 347, height: 520 },
      { x: 694, y: 0, width: 346, height: 520 },
      { x: 0, y: 520, width: 347, height: 520 },
      { x: 347, y: 520, width: 347, height: 520 },
      { x: 694, y: 520, width: 346, height: 520 },
    ],
  },
];

/** レイアウト key から ImagemapArea[] を生成（アクション初期値付き） */
export function areasFromLayout(layoutKey: LayoutKey): ImagemapArea[] {
  const preset = LAYOUT_PRESETS.find(p => p.key === layoutKey);
  if (!preset) return [];
  return preset.areas.map(a => ({
    ...a,
    action: { type: "uri" as const, value: "" },
  }));
}

/* ---------- LINE API メッセージ構築 ---------- */

/**
 * LINE Imagemap メッセージオブジェクトを構築
 * @param imageServeBaseUrl 画像サーブ用のベースURL（末尾スラッシュなし）。LINE は {baseUrl}/1040 等でアクセスする
 * @param altText 通知に表示される代替テキスト
 * @param data imagemap の設定データ
 */
export function buildImagemapMessage(
  imageServeBaseUrl: string,
  altText: string,
  data: ImagemapData,
) {
  return {
    type: "imagemap" as const,
    baseUrl: imageServeBaseUrl,
    altText,
    baseSize: data.baseSize,
    actions: data.areas
      .filter(a => a.action.value.trim())
      .map(a => {
        if (a.action.type === "uri") {
          return {
            type: "uri" as const,
            linkUri: a.action.value,
            area: { x: a.x, y: a.y, width: a.width, height: a.height },
          };
        }
        return {
          type: "message" as const,
          text: a.action.value,
          area: { x: a.x, y: a.y, width: a.width, height: a.height },
        };
      }),
  };
}

/**
 * 画像URLから imagemap 用のベースURLを生成
 * /api/line-imagemap-serve?url=<encodedImageUrl> 形式
 * LINE は {baseUrl}/1040 等でアクセスするため、
 * 実際には /api/line-imagemap-serve/1040?url=<encodedImageUrl> になる
 */
export function getImagemapBaseUrl(originUrl: string, imageUrl: string): string {
  const encoded = encodeURIComponent(imageUrl);
  return `${originUrl}/api/line-imagemap-serve?url=${encoded}`;
}

/** エリアのラベル（A, B, C...） */
export function areaLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

/** エリアカラー */
const AREA_COLORS = [
  "rgba(59, 130, 246, 0.35)",   // blue
  "rgba(239, 68, 68, 0.35)",    // red
  "rgba(34, 197, 94, 0.35)",    // green
  "rgba(234, 179, 8, 0.35)",    // yellow
  "rgba(168, 85, 247, 0.35)",   // purple
  "rgba(249, 115, 22, 0.35)",   // orange
];

export function areaColor(index: number): string {
  return AREA_COLORS[index % AREA_COLORS.length];
}

const AREA_BORDER_COLORS = [
  "rgba(59, 130, 246, 0.8)",
  "rgba(239, 68, 68, 0.8)",
  "rgba(34, 197, 94, 0.8)",
  "rgba(234, 179, 8, 0.8)",
  "rgba(168, 85, 247, 0.8)",
  "rgba(249, 115, 22, 0.8)",
];

export function areaBorderColor(index: number): string {
  return AREA_BORDER_COLORS[index % AREA_BORDER_COLORS.length];
}
