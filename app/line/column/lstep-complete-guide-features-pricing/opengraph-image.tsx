import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({
    title: "Lステップ徹底解説 — 機能・料金・評判・できることを完全網羅",
    category: "ツール比較・選定",
    description: "LINE拡張ツールの代表格「Lステップ」の全機能を徹底解説。料金プラン、シナリオ配信、セグメント管理、流入経路分析など、導入前に知っておくべき情報を網羅的に紹介します。",
    brandName: "Lオペ for LINE",
  });
}
