import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "一斉配信vsセグメント配信 — 使い分けの基準と効果の違いを徹底比較", category: "配信・メッセージング", description: "LINE公式アカウントの一斉配信とセグメント配信の効果をデータで徹底比較し、目的別の最適な使い分け基準を解説", brandName: "Lオペ" });
}
