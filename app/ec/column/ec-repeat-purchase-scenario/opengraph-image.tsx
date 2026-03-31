import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "ECのリピート購入率を2倍にするLINEシナリオ設計 — 購買サイクル別の自動配信", category: "配信・リピート促進", description: "商品の購買サイクルに合わせたLINEシナリオ配信で、リピート購入率を2倍に引き上げる方法。", brandName: "Lオペ for EC" });
}
