/**
 * 写真アノテーション — 型定義・ユーティリティ
 */

// === 型定義 ===

/** アノテーション種別 */
export type AnnotationType = "freehand" | "arrow" | "text" | "circle" | "rect";

/** 座標 */
export type Point = { x: number; y: number };

/** 1つのアノテーションデータ */
export type AnnotationData = {
  type: AnnotationType;
  /** 描画座標の配列（画像座標系 0-1 に正規化） */
  points: Point[];
  color: string;
  lineWidth: number;
  /** テキストアノテーション用 */
  text?: string;
  fontSize?: number;
};

/** 利用可能な色 */
export const ANNOTATION_COLORS = [
  { value: "#ef4444", label: "赤" },
  { value: "#3b82f6", label: "青" },
  { value: "#eab308", label: "黄" },
  { value: "#22c55e", label: "緑" },
  { value: "#000000", label: "黒" },
  { value: "#ffffff", label: "白" },
] as const;

/** 利用可能な線幅 */
export const LINE_WIDTHS = [2, 4, 6, 8] as const;

// === Undo/Redo 管理 ===

export type AnnotationHistory = {
  items: AnnotationData[];
  undoStack: AnnotationData[][];
  redoStack: AnnotationData[][];
};

/** 空の履歴を作成 */
export function createHistory(
  initial: AnnotationData[] = []
): AnnotationHistory {
  return {
    items: [...initial],
    undoStack: [],
    redoStack: [],
  };
}

/** アノテーション追加（Undo可能） */
export function pushAnnotation(
  history: AnnotationHistory,
  annotation: AnnotationData
): AnnotationHistory {
  return {
    items: [...history.items, annotation],
    undoStack: [...history.undoStack, [...history.items]],
    redoStack: [], // 新しい操作が入ったらRedoはクリア
  };
}

/** Undo */
export function undo(history: AnnotationHistory): AnnotationHistory {
  if (history.undoStack.length === 0) return history;
  const prev = history.undoStack[history.undoStack.length - 1];
  return {
    items: prev,
    undoStack: history.undoStack.slice(0, -1),
    redoStack: [...history.redoStack, [...history.items]],
  };
}

/** Redo */
export function redo(history: AnnotationHistory): AnnotationHistory {
  if (history.redoStack.length === 0) return history;
  const next = history.redoStack[history.redoStack.length - 1];
  return {
    items: next,
    undoStack: [...history.undoStack, [...history.items]],
    redoStack: history.redoStack.slice(0, -1),
  };
}

/** 全消去（Undo可能） */
export function clearAll(history: AnnotationHistory): AnnotationHistory {
  if (history.items.length === 0) return history;
  return {
    items: [],
    undoStack: [...history.undoStack, [...history.items]],
    redoStack: [],
  };
}

// === 座標変換 ===

/**
 * キャンバス上のピクセル座標を画像正規化座標 (0-1) に変換
 */
export function canvasToNormalized(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number
): Point {
  return {
    x: canvasWidth > 0 ? canvasX / canvasWidth : 0,
    y: canvasHeight > 0 ? canvasY / canvasHeight : 0,
  };
}

/**
 * 画像正規化座標 (0-1) をキャンバス上のピクセル座標に変換
 */
export function normalizedToCanvas(
  normX: number,
  normY: number,
  canvasWidth: number,
  canvasHeight: number
): Point {
  return {
    x: normX * canvasWidth,
    y: normY * canvasHeight,
  };
}

/**
 * 2点間の距離を計算
 */
export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/**
 * 矢印の頭部分の座標を計算
 * @returns [左翼, 右翼] の2点
 */
export function arrowHeadPoints(
  from: Point,
  to: Point,
  headLength: number = 0.03
): [Point, Point] {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const headAngle = Math.PI / 6; // 30度

  const left: Point = {
    x: to.x - headLength * Math.cos(angle - headAngle),
    y: to.y - headLength * Math.sin(angle - headAngle),
  };
  const right: Point = {
    x: to.x - headLength * Math.cos(angle + headAngle),
    y: to.y - headLength * Math.sin(angle + headAngle),
  };

  return [left, right];
}
