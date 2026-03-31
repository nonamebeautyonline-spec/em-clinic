import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({
    title: "LINE運用ツールの選び方 — 失敗しない5つの判断基準",
    category: "ツール比較・選定",
    description: "LINE拡張ツール選定で失敗しないための5つの判断基準を解説。機能要件・費用対効果・サポート体制・拡張性・導入実績の観点から、最適なツールを見極める方法を紹介します。",
    brandName: "Lオペ",
  });
}
