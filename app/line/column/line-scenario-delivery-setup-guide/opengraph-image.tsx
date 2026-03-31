import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({
    title: "LINEシナリオ配信の作り方 — ステップ配信で自動的に顧客を育成する方法",
    category: "配信・メッセージング",
    description: "LINE公式アカウントのシナリオ配信の設計・設定方法を完全解説。友だち追加後の自動配信シナリオで、見込み顧客を効率的に育成するテクニックを紹介します。",
    brandName: "Lオペ for LINE",
  });
}
