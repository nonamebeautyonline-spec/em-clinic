import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINEブロック率を下げる7つの方法 — 配信設計の見直しで友だち離れを防ぐ", category: "分析・改善", description: "LINE公式アカウントのブロック率を下げるための具体的な7つの施策をデータとともに解説。友だち離れを防ぐ実践的なテクニックを紹介。", brandName: "Lオペ" });
}
