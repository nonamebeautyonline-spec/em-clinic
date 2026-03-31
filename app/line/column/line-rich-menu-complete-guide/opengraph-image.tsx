import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINEリッチメニューの作り方完全ガイド — 設定から効果的なデザインまで", category: "リッチメニュー・UI設計", description: "リッチメニューの設定方法からデザインのコツまで完全解説。画像サイズ・テンプレート選択・ABテストの方法を紹介", brandName: "Lオペ" });
}
