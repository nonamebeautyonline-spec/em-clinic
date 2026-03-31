import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINEチャットボットの作り方 — ノーコードで実現する自動接客", category: "自動化・効率化", description: "LINE公式アカウントでチャットボットを構築する方法をノーコード・ローコードの手法で解説。自動接客シナリオの設計と実装手順を紹介", brandName: "Lオペ" });
}
