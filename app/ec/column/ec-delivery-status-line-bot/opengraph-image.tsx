import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINEで配送状況を確認できるボットの構築方法 — 問い合わせ削減の実践ガイド", category: "発送管理・物流", description: "顧客がLINEのトーク画面から配送状況を確認できるボットの構築方法を解説。", brandName: "Lオペ for EC" });
}
