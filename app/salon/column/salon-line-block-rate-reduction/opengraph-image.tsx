import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのLINEブロック率を下げる7つの方法 — 配信設計の見直しでお客様離れを防ぐ", category: "分析・改善", description: "サロンのLINE公式アカウントのブロック率を下げるための7つの施策を解説。", brandName: "Lオペ for SALON" });
}
