import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINE活用で売上3倍を達成した5つの事例 — 成功企業の共通パターン", category: "成功事例・ノウハウ", description: "LINE公式アカウントを活用して売上を3倍以上に伸ばした5つの企業事例を紹介。成功の共通パターンと具体的な施策を解説。", brandName: "Lオペ for LINE" });
}
