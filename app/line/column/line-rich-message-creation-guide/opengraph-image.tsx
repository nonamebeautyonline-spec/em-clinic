import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINEリッチメッセージの作り方 — クリック率を3倍にするデザインテクニック", category: "配信・メッセージング", description: "リッチメッセージの画像サイズ・デザインのポイント・テキスト配置のコツなど、クリック率を大幅に向上させるテクニックを紹介", brandName: "Lオペ for LINE" });
}
