import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINE予約システムの導入ガイド — 予約率を2倍にする仕組みの作り方", category: "自動化・効率化", description: "LINE公式アカウントに予約機能を導入する方法を徹底解説。予約率を向上させるUI設計のコツまで紹介", brandName: "Lオペ" });
}
