import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINEリッチメニューデザイン事例20選 — 業種別の効果的なUI設計パターン", category: "リッチメニュー・UI設計", description: "飲食・美容・EC・不動産・教育など業種別のリッチメニューデザイン事例を20パターン紹介", brandName: "Lオペ for LINE" });
}
