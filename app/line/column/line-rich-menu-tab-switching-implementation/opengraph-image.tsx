import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINEリッチメニューのタブ切り替え実装ガイド — 複数メニューの動的切り替え", category: "リッチメニュー・UI設計", description: "リッチメニューでタブ切り替え機能を実装する方法を解説。ツール別設定手順とUX設計パターンを紹介", brandName: "Lオペ" });
}
