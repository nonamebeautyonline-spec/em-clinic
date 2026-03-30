// lib/__tests__/line-imagemap.test.ts
// LINEイメージマップのユニットテスト

import { describe, it, expect } from "vitest";
import {
  LAYOUT_PRESETS,
  areasFromLayout,
  buildImagemapMessage,
  getImagemapBaseUrl,
  areaLabel,
  areaColor,
  areaBorderColor,
  type ImagemapData,
  type LayoutKey,
} from "@/lib/line-imagemap";

describe("line-imagemap - LINEイメージマップ", () => {
  /* ---------- LAYOUT_PRESETS ---------- */

  describe("LAYOUT_PRESETS - レイアウトプリセット", () => {
    it("6種類のプリセットが定義されている", () => {
      expect(LAYOUT_PRESETS).toHaveLength(6);
    });

    it("fullプリセットは1040x1040の1領域", () => {
      const full = LAYOUT_PRESETS.find(p => p.key === "full")!;
      expect(full.areas).toHaveLength(1);
      expect(full.areas[0]).toEqual({ x: 0, y: 0, width: 1040, height: 1040 });
    });

    it("split_hプリセットは左右2分割で幅520ずつ", () => {
      const splitH = LAYOUT_PRESETS.find(p => p.key === "split_h")!;
      expect(splitH.areas).toHaveLength(2);
      expect(splitH.areas[0].width).toBe(520);
      expect(splitH.areas[1].x).toBe(520);
      expect(splitH.areas[1].width).toBe(520);
    });

    it("grid_4プリセットは2x2で4領域、各領域がカバーする", () => {
      const grid4 = LAYOUT_PRESETS.find(p => p.key === "grid_4")!;
      expect(grid4.areas).toHaveLength(4);
      // 全領域が1040x1040をカバーすること
      const totalArea = grid4.areas.reduce((sum, a) => sum + a.width * a.height, 0);
      expect(totalArea).toBe(1040 * 1040);
    });

    it("grid_6プリセットは2x3で6領域", () => {
      const grid6 = LAYOUT_PRESETS.find(p => p.key === "grid_6")!;
      expect(grid6.areas).toHaveLength(6);
    });

    it("各プリセットにlabel・descriptionが設定されている", () => {
      for (const preset of LAYOUT_PRESETS) {
        expect(preset.label).toBeTruthy();
        expect(preset.description).toBeTruthy();
      }
    });
  });

  /* ---------- areasFromLayout ---------- */

  describe("areasFromLayout - レイアウトからエリア生成", () => {
    it("fullレイアウトで1つのエリアを返す", () => {
      const areas = areasFromLayout("full");
      expect(areas).toHaveLength(1);
      expect(areas[0].x).toBe(0);
      expect(areas[0].y).toBe(0);
      expect(areas[0].width).toBe(1040);
      expect(areas[0].height).toBe(1040);
    });

    it("生成されたエリアにはデフォルトのuriアクションが付与される", () => {
      const areas = areasFromLayout("split_v");
      for (const area of areas) {
        expect(area.action).toEqual({ type: "uri", value: "" });
      }
    });

    it("存在しないレイアウトキーでは空配列を返す", () => {
      const areas = areasFromLayout("unknown_layout" as LayoutKey);
      expect(areas).toEqual([]);
    });

    it("cols_3レイアウトで3つのエリアを返す", () => {
      const areas = areasFromLayout("cols_3");
      expect(areas).toHaveLength(3);
      // 各エリアの高さは1040
      for (const area of areas) {
        expect(area.height).toBe(1040);
      }
    });
  });

  /* ---------- buildImagemapMessage ---------- */

  describe("buildImagemapMessage - Imagemapメッセージ構築", () => {
    it("正しいimagemap構造を生成する", () => {
      const data: ImagemapData = {
        baseSize: { width: 1040, height: 1040 },
        layout: "full",
        areas: [
          { x: 0, y: 0, width: 1040, height: 1040, action: { type: "uri", value: "https://example.com" } },
        ],
      };

      const result = buildImagemapMessage("https://img.example.com/map", "テスト", data);
      expect(result.type).toBe("imagemap");
      expect(result.baseUrl).toBe("https://img.example.com/map");
      expect(result.altText).toBe("テスト");
      expect(result.baseSize).toEqual({ width: 1040, height: 1040 });
    });

    it("uriアクションの場合、linkUriプロパティが設定される", () => {
      const data: ImagemapData = {
        baseSize: { width: 1040, height: 1040 },
        layout: "full",
        areas: [
          { x: 0, y: 0, width: 1040, height: 1040, action: { type: "uri", value: "https://example.com" } },
        ],
      };

      const result = buildImagemapMessage("https://img.example.com", "テスト", data);
      expect(result.actions[0]).toMatchObject({
        type: "uri",
        linkUri: "https://example.com",
        area: { x: 0, y: 0, width: 1040, height: 1040 },
      });
    });

    it("messageアクションの場合、textプロパティが設定される", () => {
      const data: ImagemapData = {
        baseSize: { width: 1040, height: 1040 },
        layout: "full",
        areas: [
          { x: 0, y: 0, width: 1040, height: 1040, action: { type: "message", value: "予約" } },
        ],
      };

      const result = buildImagemapMessage("https://img.example.com", "テスト", data);
      expect(result.actions[0]).toMatchObject({
        type: "message",
        text: "予約",
        area: { x: 0, y: 0, width: 1040, height: 1040 },
      });
    });

    it("空のアクション値を持つエリアはフィルタされる", () => {
      const data: ImagemapData = {
        baseSize: { width: 1040, height: 1040 },
        layout: "split_h",
        areas: [
          { x: 0, y: 0, width: 520, height: 1040, action: { type: "uri", value: "https://example.com" } },
          { x: 520, y: 0, width: 520, height: 1040, action: { type: "uri", value: "" } },
        ],
      };

      const result = buildImagemapMessage("https://img.example.com", "テスト", data);
      expect(result.actions).toHaveLength(1);
    });

    it("空白のみのアクション値もフィルタされる", () => {
      const data: ImagemapData = {
        baseSize: { width: 1040, height: 1040 },
        layout: "full",
        areas: [
          { x: 0, y: 0, width: 1040, height: 1040, action: { type: "uri", value: "   " } },
        ],
      };

      const result = buildImagemapMessage("https://img.example.com", "テスト", data);
      expect(result.actions).toHaveLength(0);
    });
  });

  /* ---------- getImagemapBaseUrl ---------- */

  describe("getImagemapBaseUrl - ベースURL生成", () => {
    it("画像URLをエンコードしてベースURLを生成する", () => {
      const result = getImagemapBaseUrl(
        "https://example.com",
        "https://storage.example.com/images/map.png",
      );
      expect(result).toBe(
        "https://example.com/api/line-imagemap-serve?url=https%3A%2F%2Fstorage.example.com%2Fimages%2Fmap.png",
      );
    });

    it("特殊文字を含むURLも正しくエンコードされる", () => {
      const result = getImagemapBaseUrl(
        "https://example.com",
        "https://storage.example.com/images/map file&name.png",
      );
      expect(result).toContain("url=");
      expect(result).not.toContain(" ");
    });
  });

  /* ---------- areaLabel / areaColor / areaBorderColor ---------- */

  describe("areaLabel - エリアラベル", () => {
    it("インデックス0は「A」を返す", () => {
      expect(areaLabel(0)).toBe("A");
    });

    it("インデックス5は「F」を返す", () => {
      expect(areaLabel(5)).toBe("F");
    });
  });

  describe("areaColor / areaBorderColor - エリアカラー", () => {
    it("6色が循環する（インデックス0と6は同じ色）", () => {
      expect(areaColor(0)).toBe(areaColor(6));
      expect(areaBorderColor(0)).toBe(areaBorderColor(6));
    });

    it("rgba形式の文字列を返す", () => {
      expect(areaColor(0)).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(areaBorderColor(0)).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
    });

    it("ボーダーカラーは透明度が高い（0.8）", () => {
      expect(areaBorderColor(0)).toContain("0.8");
    });

    it("エリアカラーは透明度が低い（0.35）", () => {
      expect(areaColor(0)).toContain("0.35");
    });
  });
});
