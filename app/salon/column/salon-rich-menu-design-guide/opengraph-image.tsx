import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロン向けリッチメニューの作り方 — 予約率を2倍にするデザイン設計", category: "リッチメニュー・UI設計", description: "サロンのLINEリッチメニューを効果的に設計する方法を完全解説。予約率を向上させるデザインテンプレートを紹介。", brandName: "Lオペ for SALON" });
}
