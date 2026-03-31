import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "自費クリニックのスタッフ教育と接遇 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "スタッフ教育と接遇で\n患者満足度を高める",
    category: "運営ノウハウ",
    description: "研修ノウハウとKPI管理の実践ガイド",
  });
}
