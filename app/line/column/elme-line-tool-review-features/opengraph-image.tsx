import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({
    title: "エルメ（L Message）の評判・機能を徹底レビュー — 無料プランの実力は？",
    category: "ツール比較・選定",
    description: "LINE拡張ツール「エルメ」の機能・料金・評判を徹底レビュー。無料プランでできることと有料プランとの差を具体的に解説します。",
    brandName: "Lオペ for LINE",
  });
}
