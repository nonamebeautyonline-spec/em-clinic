import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINE公式アカウントのKPI管理ガイド — 追うべき指標と分析ダッシュボード", category: "分析・改善", description: "LINE公式アカウント運用で追うべきKPI指標と効果的な分析ダッシュボードの構築方法を解説。データドリブンな運用改善の基本を紹介。", brandName: "Lオペ" });
}
