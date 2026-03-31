import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({
    title: "LINE拡張ツール比較2026年版 — 主要8ツールの機能・費用・特徴を徹底解説",
    category: "ツール比較・選定",
    description: "Lステップ・エルメ・Liny・プロラインフリーなど主要LINE拡張ツール8社を徹底比較。機能・料金・サポート体制から、自社に最適なツールの選び方を解説します。",
    brandName: "Lオペ",
  });
}
