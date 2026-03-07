/**
 * 写真アノテーション — ユニットテスト
 * アノテーションデータ構造、Undo/Redo、座標計算のテスト
 */
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
  ANNOTATION_COLORS,
  LINE_WIDTHS,
} from "@/lib/annotation";
import type { AnnotationData, AnnotationHistory, Point } from "@/lib/annotation";

// === AnnotationData 型テスト ===
describe("AnnotationData 型構造", () => {
  it("フリーハンドアノテーションを正しく構築できる", () => {
    const ann: AnnotationData = {
      type: "freehand",
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.4 },
        { x: 0.5, y: 0.6 },
      ],
      color: "#ef4444",
      lineWidth: 4,
    };
    expect(ann.type).toBe("freehand");
    expect(ann.points).toHaveLength(3);
    expect(ann.color).toBe("#ef4444");
    expect(ann.lineWidth).toBe(4);
    expect(ann.text).toBeUndefined();
  });

  it("矢印アノテーションを正しく構築できる", () => {
    const ann: AnnotationData = {
      type: "arrow",
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.9 },
      ],
      color: "#3b82f6",
      lineWidth: 2,
    };
    expect(ann.type).toBe("arrow");
    expect(ann.points).toHaveLength(2);
  });

  it("テキストアノテーションを正しく構築できる", () => {
    const ann: AnnotationData = {
      type: "text",
      points: [{ x: 0.5, y: 0.5 }],
      color: "#000000",
      lineWidth: 2,
      text: "テスト注記",
      fontSize: 16,
    };
    expect(ann.type).toBe("text");
    expect(ann.text).toBe("テスト注記");
    expect(ann.fontSize).toBe(16);
  });

  it("円アノテーションを正しく構築できる", () => {
    const ann: AnnotationData = {
      type: "circle",
      points: [
        { x: 0.2, y: 0.2 },
        { x: 0.8, y: 0.8 },
      ],
      color: "#22c55e",
      lineWidth: 6,
    };
    expect(ann.type).toBe("circle");
    expect(ann.points).toHaveLength(2);
  });

  it("矩形アノテーションを正しく構築できる", () => {
    const ann: AnnotationData = {
      type: "rect",
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.5, y: 0.5 },
      ],
      color: "#eab308",
      lineWidth: 8,
    };
    expect(ann.type).toBe("rect");
    expect(ann.points).toHaveLength(2);
  });

  it("JSONにシリアライズ/デシリアライズできる", () => {
    const ann: AnnotationData = {
      type: "freehand",
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.4 },
      ],
      color: "#ef4444",
      lineWidth: 4,
      text: "メモ",
      fontSize: 14,
    };
    const json = JSON.stringify(ann);
    const parsed: AnnotationData = JSON.parse(json);
    expect(parsed).toEqual(ann);
  });
});

// === 定数テスト ===
describe("定数定義", () => {
  it("ANNOTATION_COLORS に6色が定義されている", () => {
    expect(ANNOTATION_COLORS).toHaveLength(6);
    const values = ANNOTATION_COLORS.map((c) => c.value);
    expect(values).toContain("#ef4444"); // 赤
    expect(values).toContain("#3b82f6"); // 青
    expect(values).toContain("#eab308"); // 黄
    expect(values).toContain("#22c55e"); // 緑
    expect(values).toContain("#000000"); // 黒
    expect(values).toContain("#ffffff"); // 白
  });

  it("LINE_WIDTHS に4種の線幅がある", () => {
    expect(LINE_WIDTHS).toHaveLength(4);
    expect([...LINE_WIDTHS]).toEqual([2, 4, 6, 8]);
  });
});

// === Undo/Redo テスト ===
describe("Undo/Redo 管理", () => {
  const sampleAnnotation: AnnotationData = {
    type: "freehand",
    points: [{ x: 0.1, y: 0.1 }],
    color: "#ef4444",
    lineWidth: 4,
  };

  const sampleAnnotation2: AnnotationData = {
    type: "arrow",
    points: [
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.8 },
    ],
    color: "#3b82f6",
    lineWidth: 2,
  };

  describe("createHistory", () => {
    it("空の履歴を作成できる", () => {
      const h = createHistory();
      expect(h.items).toEqual([]);
      expect(h.undoStack).toEqual([]);
      expect(h.redoStack).toEqual([]);
    });

    it("初期アノテーション付きで作成できる", () => {
      const initial = [sampleAnnotation];
      const h = createHistory(initial);
      expect(h.items).toHaveLength(1);
      expect(h.items[0]).toEqual(sampleAnnotation);
      // 初期状態なのでスタックは空
      expect(h.undoStack).toEqual([]);
      expect(h.redoStack).toEqual([]);
    });

    it("初期配列を変更しても履歴に影響しない（独立コピー）", () => {
      const initial = [sampleAnnotation];
      const h = createHistory(initial);
      initial.push(sampleAnnotation2);
      expect(h.items).toHaveLength(1);
    });
  });

  describe("pushAnnotation", () => {
    it("アノテーションを追加するとitemsに反映される", () => {
      const h = createHistory();
      const h2 = pushAnnotation(h, sampleAnnotation);
      expect(h2.items).toHaveLength(1);
      expect(h2.items[0]).toEqual(sampleAnnotation);
    });

    it("undoStackに前の状態が積まれる", () => {
      const h = createHistory();
      const h2 = pushAnnotation(h, sampleAnnotation);
      expect(h2.undoStack).toHaveLength(1);
      expect(h2.undoStack[0]).toEqual([]); // 追加前は空
    });

    it("redoStackがクリアされる", () => {
      let h = createHistory();
      h = pushAnnotation(h, sampleAnnotation);
      h = undo(h);
      expect(h.redoStack).toHaveLength(1);
      // 新しい追加でredoクリア
      h = pushAnnotation(h, sampleAnnotation2);
      expect(h.redoStack).toEqual([]);
    });

    it("複数回追加できる", () => {
      let h = createHistory();
      h = pushAnnotation(h, sampleAnnotation);
      h = pushAnnotation(h, sampleAnnotation2);
      expect(h.items).toHaveLength(2);
      expect(h.undoStack).toHaveLength(2);
    });
  });

  describe("undo", () => {
    it("追加をundoすると前の状態に戻る", () => {
      let h = createHistory();
      h = pushAnnotation(h, sampleAnnotation);
      h = undo(h);
      expect(h.items).toEqual([]);
      expect(h.undoStack).toEqual([]);
      expect(h.redoStack).toHaveLength(1);
    });

    it("空のundoStackではundoしても変わらない", () => {
      const h = createHistory();
      const h2 = undo(h);
      expect(h2).toBe(h); // 同一参照
    });

    it("連続undoで全操作を巻き戻せる", () => {
      let h = createHistory();
      h = pushAnnotation(h, sampleAnnotation);
      h = pushAnnotation(h, sampleAnnotation2);
      expect(h.items).toHaveLength(2);
      h = undo(h);
      expect(h.items).toHaveLength(1);
      h = undo(h);
      expect(h.items).toHaveLength(0);
    });
  });

  describe("redo", () => {
    it("undoした操作をredoで復元できる", () => {
      let h = createHistory();
      h = pushAnnotation(h, sampleAnnotation);
      h = undo(h);
      expect(h.items).toEqual([]);
      h = redo(h);
      expect(h.items).toHaveLength(1);
      expect(h.items[0]).toEqual(sampleAnnotation);
    });

    it("空のredoStackではredoしても変わらない", () => {
      const h = createHistory();
      const h2 = redo(h);
      expect(h2).toBe(h);
    });

    it("undo→redo→undoを繰り返せる", () => {
      let h = createHistory();
      h = pushAnnotation(h, sampleAnnotation);
      h = undo(h);
      expect(h.items).toHaveLength(0);
      h = redo(h);
      expect(h.items).toHaveLength(1);
      h = undo(h);
      expect(h.items).toHaveLength(0);
      h = redo(h);
      expect(h.items).toHaveLength(1);
    });

    it("連続redoで全操作を復元できる", () => {
      let h = createHistory();
      h = pushAnnotation(h, sampleAnnotation);
      h = pushAnnotation(h, sampleAnnotation2);
      h = undo(h);
      h = undo(h);
      expect(h.items).toHaveLength(0);
      h = redo(h);
      expect(h.items).toHaveLength(1);
      h = redo(h);
      expect(h.items).toHaveLength(2);
    });
  });

  describe("clearAll", () => {
    it("全消去するとitemsが空になる", () => {
      let h = createHistory();
      h = pushAnnotation(h, sampleAnnotation);
      h = pushAnnotation(h, sampleAnnotation2);
      h = clearAll(h);
      expect(h.items).toEqual([]);
    });

    it("全消去はundoで復元できる", () => {
      let h = createHistory();
      h = pushAnnotation(h, sampleAnnotation);
      h = pushAnnotation(h, sampleAnnotation2);
      h = clearAll(h);
      expect(h.items).toEqual([]);
      h = undo(h);
      expect(h.items).toHaveLength(2);
    });

    it("空の状態でclearAllしても変わらない", () => {
      const h = createHistory();
      const h2 = clearAll(h);
      expect(h2).toBe(h);
    });

    it("clearAll後にredoStackがクリアされる", () => {
      let h = createHistory();
      h = pushAnnotation(h, sampleAnnotation);
      h = undo(h);
      expect(h.redoStack).toHaveLength(1);
      // redo状態からpush→clearAll
      h = redo(h);
      h = clearAll(h);
      expect(h.redoStack).toEqual([]);
    });
  });

  describe("不変性（イミュータブル）", () => {
    it("pushAnnotationは元の履歴を変更しない", () => {
      const h = createHistory();
      const h2 = pushAnnotation(h, sampleAnnotation);
      expect(h.items).toEqual([]);
      expect(h2.items).toHaveLength(1);
    });

    it("undoは元の履歴を変更しない", () => {
      let h = createHistory();
      h = pushAnnotation(h, sampleAnnotation);
      const snapshot = { ...h, items: [...h.items] };
      const h2 = undo(h);
      expect(h.items).toEqual(snapshot.items);
      expect(h2.items).toEqual([]);
    });
  });
});

// === 座標変換テスト ===
describe("座標変換", () => {
  describe("canvasToNormalized", () => {
    it("キャンバス中心は正規化座標 (0.5, 0.5) になる", () => {
      const pt = canvasToNormalized(500, 300, 1000, 600);
      expect(pt.x).toBeCloseTo(0.5);
      expect(pt.y).toBeCloseTo(0.5);
    });

    it("原点は (0, 0) になる", () => {
      const pt = canvasToNormalized(0, 0, 1000, 600);
      expect(pt.x).toBe(0);
      expect(pt.y).toBe(0);
    });

    it("右下端は (1, 1) になる", () => {
      const pt = canvasToNormalized(800, 600, 800, 600);
      expect(pt.x).toBeCloseTo(1);
      expect(pt.y).toBeCloseTo(1);
    });

    it("キャンバスサイズ0の場合は (0, 0) を返す", () => {
      const pt = canvasToNormalized(100, 100, 0, 0);
      expect(pt.x).toBe(0);
      expect(pt.y).toBe(0);
    });
  });

  describe("normalizedToCanvas", () => {
    it("正規化座標 (0.5, 0.5) はキャンバス中心になる", () => {
      const pt = normalizedToCanvas(0.5, 0.5, 1000, 600);
      expect(pt.x).toBe(500);
      expect(pt.y).toBe(300);
    });

    it("(0, 0) は原点に変換される", () => {
      const pt = normalizedToCanvas(0, 0, 1000, 600);
      expect(pt.x).toBe(0);
      expect(pt.y).toBe(0);
    });

    it("(1, 1) はキャンバスの右下端になる", () => {
      const pt = normalizedToCanvas(1, 1, 800, 600);
      expect(pt.x).toBe(800);
      expect(pt.y).toBe(600);
    });
  });

  describe("往復変換の精度", () => {
    it("canvasToNormalized → normalizedToCanvas で元の座標に戻る", () => {
      const origX = 350;
      const origY = 220;
      const cw = 1000;
      const ch = 600;
      const norm = canvasToNormalized(origX, origY, cw, ch);
      const back = normalizedToCanvas(norm.x, norm.y, cw, ch);
      expect(back.x).toBeCloseTo(origX);
      expect(back.y).toBeCloseTo(origY);
    });

    it("異なるキャンバスサイズでスケーリングされる", () => {
      const norm = canvasToNormalized(100, 50, 200, 100);
      // 同じ正規化座標を大きいキャンバスに適用
      const pt = normalizedToCanvas(norm.x, norm.y, 400, 200);
      expect(pt.x).toBe(200);
      expect(pt.y).toBe(100);
    });
  });
});

// === 距離計算テスト ===
describe("distance", () => {
  it("同じ点の距離は0", () => {
    expect(distance({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })).toBe(0);
  });

  it("水平距離を正しく計算する", () => {
    expect(distance({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(1);
  });

  it("垂直距離を正しく計算する", () => {
    expect(distance({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(1);
  });

  it("斜め距離を正しく計算する (3-4-5三角形)", () => {
    expect(distance({ x: 0, y: 0 }, { x: 0.3, y: 0.4 })).toBeCloseTo(0.5);
  });
});

// === 矢印の頭計算テスト ===
describe("arrowHeadPoints", () => {
  it("2つの翼ポイントを返す", () => {
    const [left, right] = arrowHeadPoints(
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 }
    );
    expect(left).toHaveProperty("x");
    expect(left).toHaveProperty("y");
    expect(right).toHaveProperty("x");
    expect(right).toHaveProperty("y");
  });

  it("翼ポイントは矢印の先端より手前にある", () => {
    const to: Point = { x: 1, y: 0.5 };
    const [left, right] = arrowHeadPoints({ x: 0, y: 0.5 }, to);
    // 左右とも先端のxより小さい（水平右向きの矢印）
    expect(left.x).toBeLessThan(to.x);
    expect(right.x).toBeLessThan(to.x);
  });

  it("翼ポイントは先端を挟んで対称に配置される", () => {
    const from: Point = { x: 0, y: 0.5 };
    const to: Point = { x: 1, y: 0.5 };
    const [left, right] = arrowHeadPoints(from, to);
    // 水平矢印なので左右のy座標は先端を挟んで対称
    const leftDy = left.y - to.y;
    const rightDy = right.y - to.y;
    expect(leftDy).toBeCloseTo(-rightDy);
  });

  it("カスタムヘッド長さを指定できる", () => {
    const [left1] = arrowHeadPoints({ x: 0, y: 0.5 }, { x: 1, y: 0.5 }, 0.03);
    const [left2] = arrowHeadPoints({ x: 0, y: 0.5 }, { x: 1, y: 0.5 }, 0.06);
    // 大きいヘッド長さの方が先端から遠い
    const dist1 = distance(left1, { x: 1, y: 0.5 });
    const dist2 = distance(left2, { x: 1, y: 0.5 });
    expect(dist2).toBeGreaterThan(dist1);
  });

  it("垂直矢印でも正しく計算できる", () => {
    const from: Point = { x: 0.5, y: 0 };
    const to: Point = { x: 0.5, y: 1 };
    const [left, right] = arrowHeadPoints(from, to);
    // 垂直矢印の翼は左右に広がる
    expect(left.y).toBeLessThan(to.y);
    expect(right.y).toBeLessThan(to.y);
    // xは先端を挟んで左右対称
    const leftDx = left.x - to.x;
    const rightDx = right.x - to.x;
    expect(leftDx).toBeCloseTo(-rightDx);
  });
});
