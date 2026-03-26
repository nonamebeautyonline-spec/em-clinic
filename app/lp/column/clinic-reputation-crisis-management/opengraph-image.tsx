import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "自費クリニックの口コミ炎上対策 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "自費クリニックの\n口コミ炎上対策",
    category: "経営戦略",
    description: "法的対応・風評管理・患者コミュニケーション",
  });
}
