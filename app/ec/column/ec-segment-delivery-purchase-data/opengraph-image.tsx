import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "購買データを活用したLINEセグメント配信 — EC売上を最大化する配信設計", category: "配信・リピート促進", description: "購入金額・商品カテゴリ・購入頻度など、EC特有のデータを活用したセグメント配信の設計方法。", brandName: "Lオペ for EC" });
}
