import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "教育・スクール業界のLINE運用ガイド — 生徒募集から継続率向上まで", category: "業種別活用事例", description: "学習塾・英会話スクールがLINE公式アカウントを活用する方法を解説。体験授業の予約受付、入会促進、保護者コミュニケーションの成功事例を紹介。", brandName: "Lオペ for LINE" });
}
