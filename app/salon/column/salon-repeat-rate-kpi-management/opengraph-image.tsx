import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのリピート率KPI管理ガイド — 追うべき指標と改善サイクルの作り方", category: "分析・改善", description: "サロンのLINE運用で追うべきKPI指標と、リピート率を継続的に改善するPDCAサイクルの構築方法。", brandName: "Lオペ for SALON" });
}
