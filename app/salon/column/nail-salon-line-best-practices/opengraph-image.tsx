import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "ネイルサロンのLINE運用ベストプラクティス — デザイン訴求からリピート促進まで", category: "業態別活用事例", description: "ネイルサロンがLINE公式アカウントを効果的に活用する方法を解説。", brandName: "Lオペ for SALON" });
}
