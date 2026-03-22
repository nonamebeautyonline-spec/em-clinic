import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの固定費を月30万円削減する方法 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの固定費を\n月30万円削減する方法",
    category: "業務改善",
    description: "複数ツールをLINE一本化で実現",
  });
}
