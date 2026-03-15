// lib/flex-editor/dnd-utils.ts
// ドラッグ&ドロップ操作のための純粋ユーティリティ関数

import type { EditorBlock, BlockType } from "./block-types";

/** ツールバーからのドラッグインかどうかを判定 */
export const TOOLBOX_PREFIX = "toolbox-";

/** ドラッグIDがツールバー由来かを判定する */
export function isToolboxDragId(id: string): boolean {
  return typeof id === "string" && id.startsWith(TOOLBOX_PREFIX);
}

/** ツールバーのドラッグIDからBlockTypeを取得 */
export function parseToolboxBlockType(id: string): BlockType | null {
  if (!isToolboxDragId(id)) return null;
  const type = id.slice(TOOLBOX_PREFIX.length);
  const validTypes: BlockType[] = ["title", "text", "image", "button", "separator", "icon_text", "badge", "countdown", "rating", "map_link", "coupon", "video"];
  return validTypes.includes(type as BlockType) ? (type as BlockType) : null;
}

/** ブロック配列を並べ替える（activeId → overId の位置に移動） */
export function reorderBlocks(
  blocks: EditorBlock[],
  activeId: string,
  overId: string,
): EditorBlock[] {
  if (activeId === overId) return blocks;

  const oldIndex = blocks.findIndex((b) => b.id === activeId);
  const newIndex = blocks.findIndex((b) => b.id === overId);

  if (oldIndex < 0 || newIndex < 0) return blocks;

  const result = [...blocks];
  const [removed] = result.splice(oldIndex, 1);
  result.splice(newIndex, 0, removed);
  return result;
}

/** 新しいブロックを指定位置に挿入する */
export function insertBlockAt(
  blocks: EditorBlock[],
  newBlock: EditorBlock,
  overId: string | null,
): EditorBlock[] {
  if (!overId) {
    // ドロップ先が見つからない場合は末尾に追加
    return [...blocks, newBlock];
  }

  const overIndex = blocks.findIndex((b) => b.id === overId);
  if (overIndex < 0) {
    return [...blocks, newBlock];
  }

  const result = [...blocks];
  result.splice(overIndex, 0, newBlock);
  return result;
}

/** ドロップ先のインデックスを取得 */
export function getDropIndex(
  blocks: EditorBlock[],
  overId: string | null,
): number {
  if (!overId) return blocks.length;
  const idx = blocks.findIndex((b) => b.id === overId);
  return idx < 0 ? blocks.length : idx;
}
