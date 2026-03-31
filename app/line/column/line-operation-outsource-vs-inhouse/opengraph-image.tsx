import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINE運用代行vs自社運用 — コスト・成果・リスクで徹底比較", category: "成功事例・ノウハウ", description: "LINE公式アカウントの運用を外注するか自社で行うか。費用相場・成果の違い・リスクの観点から最適な運用形態の選び方を解説。", brandName: "Lオペ" });
}
