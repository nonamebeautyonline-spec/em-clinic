import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "EC×LINEのA/Bテスト実践ガイド — 配信効果を科学的に改善する方法", category: "分析・改善", description: "LINE配信のA/Bテストの設計から実施、結果分析までの実践ガイド。", brandName: "Lオペ for EC" });
}
