import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "クリニックの自費診療売上を伸ばすLINE配信戦略 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの自費診療売上を\n伸ばすLINE配信戦略",
    category: "マーケティング",
    description: "セグメント配信で診療単価を向上させる方法",
  });
}
