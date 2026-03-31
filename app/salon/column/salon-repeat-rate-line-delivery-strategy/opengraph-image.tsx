import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのリピート率を上げるLINE配信術 — セグメント設計から実践まで", category: "配信・リピート促進", description: "サロンのリピート率をLINE配信で向上させる方法を解説。セグメント設計と配信シナリオの作り方。", brandName: "Lオペ for SALON" });
}
