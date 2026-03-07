/**
 * リッチメニューエディタ用グリッドスナップユーティリティ
 * ドラッグ操作時に座標をグリッドに吸着させる
 */

/** 利用可能なグリッドサイズ（px単位、リッチメニュー実座標ベース） */
export const GRID_SIZES = [10, 20, 50] as const;
export type GridSize = (typeof GRID_SIZES)[number];

/** スナップなし（フリー移動）を示す値 */
export const SNAP_NONE = 0;

/**
 * 座標値をグリッドサイズに丸める
 * @param value - 元の座標値
 * @param gridSize - グリッドサイズ（0の場合はスナップなし）
 * @param shiftKey - Shiftキーが押されている場合はスナップ無効
 * @returns スナップ後の座標値
 */
export function snapValue(
  value: number,
  gridSize: number,
  shiftKey: boolean = false
): number {
  if (shiftKey || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

/**
 * 矩形の座標・サイズをグリッドにスナップする
 * @param bounds - 元の矩形（x, y, width, height）
 * @param gridSize - グリッドサイズ
 * @param shiftKey - Shiftキー押下中はスナップ無効
 * @returns スナップ後の矩形
 */
export function snapBounds(
  bounds: { x: number; y: number; width: number; height: number },
  gridSize: number,
  shiftKey: boolean = false
): { x: number; y: number; width: number; height: number } {
  return {
    x: snapValue(bounds.x, gridSize, shiftKey),
    y: snapValue(bounds.y, gridSize, shiftKey),
    width: snapValue(bounds.width, gridSize, shiftKey),
    height: snapValue(bounds.height, gridSize, shiftKey),
  };
}

/**
 * キャンバス表示用のグリッド線座標を生成する
 * @param canvasWidth - キャンバスの幅（表示px）
 * @param canvasHeight - キャンバスの高さ（表示px）
 * @param gridSize - グリッドサイズ（リッチメニュー実座標）
 * @param scaleX - X方向の縮尺（表示px / 実座標）
 * @param scaleY - Y方向の縮尺（表示px / 実座標）
 * @returns 縦線・横線の表示座標配列
 */
export function generateGridLines(
  canvasWidth: number,
  canvasHeight: number,
  gridSize: number,
  scaleX: number,
  scaleY: number
): { verticals: number[]; horizontals: number[] } {
  if (gridSize <= 0) return { verticals: [], horizontals: [] };

  // 実座標での最大値
  const realWidth = canvasWidth / scaleX;
  const realHeight = canvasHeight / scaleY;

  const verticals: number[] = [];
  for (let x = gridSize; x < realWidth; x += gridSize) {
    verticals.push(x * scaleX);
  }

  const horizontals: number[] = [];
  for (let y = gridSize; y < realHeight; y += gridSize) {
    horizontals.push(y * scaleY);
  }

  return { verticals, horizontals };
}
