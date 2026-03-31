import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのリッチメニューA/Bテスト — 予約率を改善するUI最適化手法", category: "リッチメニュー・UI設計", description: "サロンのLINEリッチメニューでA/Bテストを実施し、予約率・クリック率を改善する方法を解説。", brandName: "Lオペ for SALON" });
}
