import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({
    title: "無料で使えるLINE拡張ツール比較 — 0円から始めるLINE運用強化",
    category: "ツール比較・選定",
    description: "無料プランが使えるLINE拡張ツールを徹底比較。エルメ・プロラインフリー・Poster・公式機能のみなど、コストゼロで始められるLINE運用強化の選択肢を紹介します。",
    brandName: "Lオペ",
  });
}
