import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "ECのLINEクーポン配信戦略 — 初回購入・リピート・休眠復帰別の最適設計", category: "配信・リピート促進", description: "目的別のLINEクーポン配信戦略。割引率の最適化と利益を守るクーポン設計のベストプラクティス。", brandName: "Lオペ for EC" });
}
