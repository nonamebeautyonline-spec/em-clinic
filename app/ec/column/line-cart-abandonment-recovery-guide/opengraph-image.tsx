import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINEでカゴ落ち率を50%改善する方法 — リマインド配信の設計と最適化", category: "カゴ落ち対策", description: "LINEのカゴ落ちリマインド配信で回収率を最大化する方法を徹底解説。", brandName: "Lオペ for EC" });
}
