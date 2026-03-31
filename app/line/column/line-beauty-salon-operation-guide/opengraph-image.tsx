import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "美容サロンのLINE運用ガイド — 予約管理からリピート促進まで完全解説", category: "業種別活用事例", description: "美容室・エステ・ネイルサロンがLINE公式アカウントを活用する方法を完全解説。予約自動化・施術後フォロー・リピート促進の成功パターンを紹介", brandName: "Lオペ for LINE" });
}
