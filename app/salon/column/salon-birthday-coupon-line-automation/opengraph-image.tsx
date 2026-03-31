import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンの誕生日クーポンをLINEで自動配信 — 設定方法と効果を最大化するコツ", category: "配信・リピート促進", description: "サロンでLINEの誕生日クーポン自動配信を設定する方法を解説。", brandName: "Lオペ for SALON" });
}
