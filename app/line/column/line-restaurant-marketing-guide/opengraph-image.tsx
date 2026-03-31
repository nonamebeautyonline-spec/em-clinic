import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "飲食店のLINE公式アカウント活用術 — リピート率を2倍にする運用戦略", category: "業種別活用事例", description: "飲食店がLINE公式アカウントを活用してリピート率を向上させる運用戦略。クーポン配信・ショップカード・予約管理など飲食業界に特化した施策を紹介", brandName: "Lオペ for LINE" });
}
