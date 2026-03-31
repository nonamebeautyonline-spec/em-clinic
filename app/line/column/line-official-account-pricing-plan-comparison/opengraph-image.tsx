import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({
    title: "LINE公式アカウント料金プラン完全比較 — 無料・ライト・スタンダードの選び方",
    category: "LINE公式アカウント入門",
    description: "LINE公式アカウントの3つの料金プランを徹底比較。配信通数・機能差・費用対効果から最適なプラン選びのポイントを解説します。",
    brandName: "Lオペ for LINE",
  });
}
