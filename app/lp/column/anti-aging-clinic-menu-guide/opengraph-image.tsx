import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "アンチエイジング内服メニューの導入ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "アンチエイジング内服\nメニュー導入ガイド",
    category: "開業・経営",
    description: "処方設計・価格戦略・オンライン診療対応まで網羅",
  });
}
