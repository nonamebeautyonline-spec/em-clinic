import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "カゴ落ちクーポン戦略 — 割引率の最適化と利益を守る設計", category: "カゴ落ち対策", description: "カゴ落ちリマインドにクーポンを付ける最適な割引率と利益を守るクーポン戦略を解説。", brandName: "Lオペ for EC" });
}
