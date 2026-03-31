import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINE開封率・クリック率を改善する方法 — データで見る最適化テクニック", category: "分析・改善", description: "LINE公式アカウントの開封率・クリック率を改善する具体的な方法をデータとともに解説。配信タイミング・CTA設計など最適化テクニックを紹介。", brandName: "Lオペ for LINE" });
}
