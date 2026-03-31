import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINE配信の最適な頻度・時間帯 — データで見る効果的な配信タイミング", category: "配信・メッセージング", description: "業種別のデータをもとに最適な配信頻度・時間帯・曜日を解説し、ブロック率を抑えつつ開封率を最大化する配信スケジュールの設計方法を紹介", brandName: "Lオペ" });
}
