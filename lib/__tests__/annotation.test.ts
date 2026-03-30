// lib/__tests__/annotation.test.ts
// 写真アノテーション — ユーティリティのテスト
import { describe, it, expect } from "vitest";
import {
  createHistory,
  pushAnnotation,
  undo,
  redo,
  clearAll,
  canvasToNormalized,
  normalizedToCanvas,
  distance,
  arrowHeadPoints,
  type AnnotationData,
} from "@/lib/annotation";

const sampleAnnotation: AnnotationData = {
  type: "freehand",
  points: [{ x: 0.1, y: 0.2 }],
  color: "#ef4444",
  lineWidth: 2,
};

const sampleAnnotation2: AnnotationData = {
  type: "arrow",
  points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  color: "#3b82f6",
  lineWidth: 4,
};

describe("createHistory", () => {
  it("空の初期状態を作成する", () => {
    const h = createHistory();
    expect(h.items).toEqual([]);
    expect(h.undoStack).toEqual([]);
    expect(h.redoStack).toEqual([]);
  });

  it("初期データ付きで作成できる", () => {
    const h = createHistory([sampleAnnotation]);
    expect(h.items).toHaveLength(1);
    expect(h.items[0].type).toBe("freehand");
  });
});

describe("pushAnnotation", () => {
  it("アノテーションを追加しundo履歴に保存する", () => {
    const h0 = createHistory();
    const h1 = pushAnnotation(h0, sampleAnnotation);
    expect(h1.items).toHaveLength(1);
    expect(h1.undoStack).toHaveLength(1);
    expect(h1.undoStack[0]).toEqual([]); // push前は空
  });

  it("追加するとredoStackがクリアされる", () => {
    let h = createHistory();
    h = pushAnnotation(h, sampleAnnotation);
    h = undo(h);
    expect(h.redoStack).toHaveLength(1);
    h = pushAnnotation(h, sampleAnnotation2);
    expect(h.redoStack).toHaveLength(0);
  });
});

describe("undo / redo", () => {
  it("undoで前の状態に戻る", () => {
    let h = createHistory();
    h = pushAnnotation(h, sampleAnnotation);
    h = pushAnnotation(h, sampleAnnotation2);
    expect(h.items).toHaveLength(2);
    h = undo(h);
    expect(h.items).toHaveLength(1);
    expect(h.items[0].type).toBe("freehand");
  });

  it("undoStackが空の場合は何も変わらない", () => {
    const h = createHistory();
    const h2 = undo(h);
    expect(h2).toBe(h); // 同一参照
  });

  it("redoでundo前の状態に戻す", () => {
    let h = createHistory();
    h = pushAnnotation(h, sampleAnnotation);
    h = undo(h);
    expect(h.items).toHaveLength(0);
    h = redo(h);
    expect(h.items).toHaveLength(1);
  });

  it("redoStackが空の場合は何も変わらない", () => {
    const h = createHistory();
    const h2 = redo(h);
    expect(h2).toBe(h);
  });

  it("複数回のundo/redoが正しく動作する", () => {
    let h = createHistory();
    h = pushAnnotation(h, sampleAnnotation);
    h = pushAnnotation(h, sampleAnnotation2);
    h = undo(h);
    h = undo(h);
    expect(h.items).toHaveLength(0);
    h = redo(h);
    h = redo(h);
    expect(h.items).toHaveLength(2);
  });
});

describe("clearAll", () => {
  it("全消去してundo可能にする", () => {
    let h = createHistory();
    h = pushAnnotation(h, sampleAnnotation);
    h = pushAnnotation(h, sampleAnnotation2);
    h = clearAll(h);
    expect(h.items).toHaveLength(0);
    expect(h.undoStack).toHaveLength(3); // 初期2回push + clearAll
  });

  it("空の状態でclearAllしても変わらない", () => {
    const h = createHistory();
    const h2 = clearAll(h);
    expect(h2).toBe(h);
  });
});

describe("canvasToNormalized", () => {
  it("キャンバス座標を正規化座標に変換する", () => {
    const p = canvasToNormalized(500, 250, 1000, 500);
    expect(p.x).toBe(0.5);
    expect(p.y).toBe(0.5);
  });

  it("キャンバスサイズが0の場合は0を返す", () => {
    const p = canvasToNormalized(100, 100, 0, 0);
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
  });
});

describe("normalizedToCanvas", () => {
  it("正規化座標をキャンバス座標に変換する", () => {
    const p = normalizedToCanvas(0.5, 0.5, 1000, 500);
    expect(p.x).toBe(500);
    expect(p.y).toBe(250);
  });
});

describe("distance", () => {
  it("2点間の距離を計算する", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("同一点の距離は0", () => {
    expect(distance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
  });
});

describe("arrowHeadPoints", () => {
  it("矢印の頭部分の2点を返す", () => {
    const [left, right] = arrowHeadPoints({ x: 0, y: 0 }, { x: 1, y: 0 });
    // 右向き矢印: 頭部分はto(1,0)より左にある
    expect(left.x).toBeLessThan(1);
    expect(right.x).toBeLessThan(1);
    // 左翼と右翼はy軸で対称（符号が逆）
    expect(left.y).toBeGreaterThan(0); // 下方（canvas座標系でy正が下）
    expect(right.y).toBeLessThan(0); // 上方
  });

  it("headLengthを指定できる", () => {
    const [left1] = arrowHeadPoints({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.03);
    const [left2] = arrowHeadPoints({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.06);
    // headLengthが大きいほど矢頭が遠い
    expect(Math.abs(1 - left2.x)).toBeGreaterThan(Math.abs(1 - left1.x));
  });
});
