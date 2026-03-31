import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({
    title: "LINEセグメント配信設計ガイド — ターゲティング精度を高める実践手法",
    category: "配信・メッセージング",
    description: "LINE公式アカウントのセグメント配信を効果的に設計する方法を解説。属性タグ・行動データを活用したターゲティング手法と配信効果を最大化するポイントを紹介します。",
    brandName: "Lオペ",
  });
}
