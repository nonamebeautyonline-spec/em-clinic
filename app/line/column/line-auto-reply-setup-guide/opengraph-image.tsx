import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINE自動応答設定ガイド — キーワード応答からAI応答まで完全解説", category: "自動化・効率化", description: "LINE公式アカウントの自動応答機能を最大限に活用する設定方法を解説。24時間対応を実現するためのベストプラクティスを紹介", brandName: "Lオペ" });
}
