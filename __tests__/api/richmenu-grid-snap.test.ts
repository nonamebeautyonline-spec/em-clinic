import { describe, it, expect } from "vitest";
import {
  snapValue,
  snapBounds,
  generateGridLines,
  GRID_SIZES,
  SNAP_NONE,
} from "@/lib/grid-snap";

describe("snapValue", () => {
  it("10pxグリッドにスナップする", () => {
    expect(snapValue(13, 10)).toBe(10);
    expect(snapValue(17, 10)).toBe(20);
    expect(snapValue(15, 10)).toBe(20); // 四捨五入で切り上げ
    expect(snapValue(0, 10)).toBe(0);
    expect(snapValue(100, 10)).toBe(100);
  });

  it("20pxグリッドにスナップする", () => {
    expect(snapValue(13, 20)).toBe(20);
    expect(snapValue(9, 20)).toBe(0);
    expect(snapValue(30, 20)).toBe(40); // 30/20=1.5 → 四捨五入で2 → 40
    expect(snapValue(31, 20)).toBe(40);
    expect(snapValue(100, 20)).toBe(100);
  });

  it("50pxグリッドにスナップする", () => {
    expect(snapValue(24, 50)).toBe(0);
    expect(snapValue(25, 50)).toBe(50);
    expect(snapValue(74, 50)).toBe(50);
    expect(snapValue(75, 50)).toBe(100);
    expect(snapValue(250, 50)).toBe(250);
  });

  it("Shiftキー押下時はスナップ無効（フリー移動）", () => {
    expect(snapValue(13, 10, true)).toBe(13);
    expect(snapValue(17, 20, true)).toBe(17);
    expect(snapValue(33, 50, true)).toBe(33);
  });

  it("gridSize=0の場合はスナップしない", () => {
    expect(snapValue(13, 0)).toBe(13);
    expect(snapValue(17, 0)).toBe(17);
  });

  it("負のgridSizeの場合はスナップしない", () => {
    expect(snapValue(13, -10)).toBe(13);
  });

  it("負の座標値も正しくスナップする", () => {
    // 通常はリッチメニューで負値は使わないが、安全のため
    expect(snapValue(-13, 10)).toBe(-10);
    expect(snapValue(-17, 10)).toBe(-20);
  });
});

describe("snapBounds", () => {
  it("矩形全体をグリッドにスナップする", () => {
    const bounds = { x: 13, y: 27, width: 104, height: 53 };
    const result = snapBounds(bounds, 10);
    expect(result).toEqual({ x: 10, y: 30, width: 100, height: 50 });
  });

  it("50pxグリッドでスナップする", () => {
    const bounds = { x: 124, y: 276, width: 510, height: 330 };
    const result = snapBounds(bounds, 50);
    expect(result).toEqual({ x: 100, y: 300, width: 500, height: 350 });
  });

  it("Shiftキーでスナップ無効", () => {
    const bounds = { x: 13, y: 27, width: 104, height: 53 };
    const result = snapBounds(bounds, 10, true);
    expect(result).toEqual({ x: 13, y: 27, width: 104, height: 53 });
  });

  it("gridSize=0でスナップしない", () => {
    const bounds = { x: 13, y: 27, width: 104, height: 53 };
    const result = snapBounds(bounds, 0);
    expect(result).toEqual(bounds);
  });

  it("すでにグリッド上の値はそのまま", () => {
    const bounds = { x: 100, y: 200, width: 500, height: 300 };
    const result = snapBounds(bounds, 50);
    expect(result).toEqual(bounds);
  });
});

describe("generateGridLines", () => {
  // リッチメニューのキャンバス設定: 2500x1686 → 600x405表示
  const CANVAS_W = 600;
  const CANVAS_H = 405;
  const scaleX = CANVAS_W / 2500;
  const scaleY = CANVAS_H / 1686;

  it("10pxグリッドで線を生成する", () => {
    const { verticals, horizontals } = generateGridLines(
      CANVAS_W, CANVAS_H, 10, scaleX, scaleY
    );
    // 2500/10 - 1 = 249本の縦線
    expect(verticals.length).toBe(249);
    // 1686/10 - 1 = 167本の横線（1686は10で割り切れないので168本まで）
    // 10, 20, ..., 1680 → 168本
    expect(horizontals.length).toBe(168);
    // 最初の縦線は10 * scaleX
    expect(verticals[0]).toBeCloseTo(10 * scaleX, 5);
  });

  it("50pxグリッドで線を生成する", () => {
    const { verticals, horizontals } = generateGridLines(
      CANVAS_W, CANVAS_H, 50, scaleX, scaleY
    );
    // 2500/50 - 1 = 49本の縦線
    expect(verticals.length).toBe(49);
    // 1686/50: 50, 100, ..., 1650 → 33本
    expect(horizontals.length).toBe(33);
  });

  it("20pxグリッドで線を生成する", () => {
    const { verticals, horizontals } = generateGridLines(
      CANVAS_W, CANVAS_H, 20, scaleX, scaleY
    );
    // 2500/20 - 1 = 124本
    expect(verticals.length).toBe(124);
    // 1686/20: 20,40,...,1680 → 84本
    expect(horizontals.length).toBe(84);
  });

  it("gridSize=0で空配列を返す", () => {
    const result = generateGridLines(CANVAS_W, CANVAS_H, 0, scaleX, scaleY);
    expect(result).toEqual({ verticals: [], horizontals: [] });
  });

  it("負のgridSizeで空配列を返す", () => {
    const result = generateGridLines(CANVAS_W, CANVAS_H, -10, scaleX, scaleY);
    expect(result).toEqual({ verticals: [], horizontals: [] });
  });
});

describe("定数", () => {
  it("GRID_SIZESが正しい値を持つ", () => {
    expect(GRID_SIZES).toEqual([10, 20, 50]);
  });

  it("SNAP_NONEが0", () => {
    expect(SNAP_NONE).toBe(0);
  });
});
