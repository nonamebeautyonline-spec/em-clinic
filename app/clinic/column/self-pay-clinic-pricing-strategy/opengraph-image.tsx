import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "自費クリニックの価格設定ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "自費クリニックの\n価格設定ガイド",
    category: "経営戦略",
    description: "適正価格の決め方と収益シミュレーション",
  });
}
