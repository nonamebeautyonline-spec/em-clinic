import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンの予約チャネル最適化 — 電話・Web・LINE・SNSの使い分けガイド", category: "予約管理・ホットペッパー連携", description: "サロンの予約チャネルを最適化する方法を解説。各チャネルの特性を活かした予約導線設計。", brandName: "Lオペ for SALON" });
}
