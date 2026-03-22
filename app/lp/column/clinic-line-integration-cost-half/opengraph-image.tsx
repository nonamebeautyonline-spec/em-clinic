import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの月間経費を半減させるLINE一本化戦略 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの月間経費を\n半減させるLINE一本化戦略",
    category: "業務改善",
    description: "ツール統合で実現するコスト最適化",
  });
}
