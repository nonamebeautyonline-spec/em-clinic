// lib/__tests__/grid-snap.test.ts
// グリッドスナップユーティリティのテスト
import { describe, it, expect } from "vitest";
import {
  snapValue,
  snapBounds,
  generateGridLines,
  GRID_SIZES,
  SNAP_NONE,
} from "@/lib/grid-snap";

describe("snapValue", () => {
  it("グリッドサイズに丸める（四捨五入）", () => {
    expect(snapValue(14, 10)).toBe(10);
    expect(snapValue(15, 10)).toBe(20);
    expect(snapValue(25, 10)).toBe(30);
  });

  it("gridSize=0の場合はスナップしない", () => {
    expect(snapValue(14, 0)).toBe(14);
  });

  it("shiftKey=trueの場合はスナップしない", () => {
    expect(snapValue(14, 10, true)).toBe(14);
  });

  it("負のgridSizeではスナップしない", () => {
    expect(snapValue(14, -5)).toBe(14);
  });

  it("0はそのまま0を返す", () => {
    expect(snapValue(0, 10)).toBe(0);
  });

  it("gridSize=20でスナップする", () => {
    expect(snapValue(35, 20)).toBe(40);
    expect(snapValue(29, 20)).toBe(20);
  });
});

describe("snapBounds", () => {
  it("矩形の全プロパティをスナップする", () => {
    const result = snapBounds({ x: 14, y: 26, width: 53, height: 47 }, 10);
    expect(result).toEqual({ x: 10, y: 30, width: 50, height: 50 });
  });

  it("shiftKeyでスナップ無効", () => {
    const bounds = { x: 14, y: 26, width: 53, height: 47 };
    const result = snapBounds(bounds, 10, true);
    expect(result).toEqual(bounds);
  });

  it("gridSize=0でスナップ無効", () => {
    const bounds = { x: 14, y: 26, width: 53, height: 47 };
    const result = snapBounds(bounds, 0);
    expect(result).toEqual(bounds);
  });
});

describe("generateGridLines", () => {
  it("グリッド線の座標配列を生成する", () => {
    // 実座標100x50, scale=1, gridSize=20
    const result = generateGridLines(100, 50, 20, 1, 1);
    expect(result.verticals).toEqual([20, 40, 60, 80]);
    expect(result.horizontals).toEqual([20, 40]);
  });

  it("gridSize=0の場合は空配列を返す", () => {
    const result = generateGridLines(100, 50, 0, 1, 1);
    expect(result.verticals).toEqual([]);
    expect(result.horizontals).toEqual([]);
  });

  it("スケールファクターが適用される", () => {
    // canvasWidth=100, scaleX=0.5 → realWidth=200, gridSize=50
    // 実座標での線: x=50,100,150 → 表示: 25,50,75
    // canvasHeight=50, scaleY=0.5 → realHeight=100, gridSize=50
    // 実座標での線: y=50 → 表示: 25
    const result = generateGridLines(100, 50, 50, 0.5, 0.5);
    expect(result.verticals).toEqual([25, 50, 75]);
    expect(result.horizontals).toEqual([25]);
  });

  it("キャンバスが小さくて線がない場合は空を返す", () => {
    // 実座標10x10, gridSize=50 → 線なし
    const result = generateGridLines(10, 10, 50, 1, 1);
    expect(result.verticals).toEqual([]);
    expect(result.horizontals).toEqual([]);
  });
});

describe("定数", () => {
  it("GRID_SIZESが正しい値を持つ", () => {
    expect(GRID_SIZES).toEqual([10, 20, 50]);
  });

  it("SNAP_NONEは0", () => {
    expect(SNAP_NONE).toBe(0);
  });
});
