import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "ECサイトのLINEブロック率を下げる7つの方法 — 配信頻度と内容の最適化", category: "配信・リピート促進", description: "ECサイトのLINE配信でブロック率が上がる原因と、具体的な改善方法を7つ紹介。", brandName: "Lオペ for EC" });
}
