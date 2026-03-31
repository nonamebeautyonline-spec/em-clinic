import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのLINE公式アカウント運用代行 vs 自社運用 — どちらが正解？";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニックのLINE公式アカウント運用代行 vs 自社運用 — どちらが正解？",
    category: "比較",
    description:
      "LINE公式アカウントの運用代行と自社運用を徹底比較。費用・効果・柔軟性の観点から、クリニック規模別の最適な運用方法を解説。",
  });
}
