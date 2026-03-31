import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのLINEクーポン設計ベストプラクティス — 効果を出す5つのルール", category: "配信・リピート促進", description: "サロンがLINEで配信するクーポンの設計ルールを5つ紹介。割引率・有効期限・条件設定の最適解。", brandName: "Lオペ for SALON" });
}
