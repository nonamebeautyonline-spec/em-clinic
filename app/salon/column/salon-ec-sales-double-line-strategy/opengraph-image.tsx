import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "エステサロンの物販売上をLINEで2倍にした方法 — クロスセル戦略の実践", category: "成功事例・売上UP", description: "エステサロンがLINEの物販機能を活用してホームケア商品の売上を2倍にした事例を解説。", brandName: "Lオペ for SALON" });
}
