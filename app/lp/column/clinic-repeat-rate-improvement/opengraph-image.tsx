import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "クリニックのリピート率を劇的に改善する方法 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのリピート率を\n劇的に改善する方法",
    category: "マーケティング",
    description: "LINE自動フォローで再診率を1.5倍にする戦略",
  });
}
