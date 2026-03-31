import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのLINE開封率を上げるテクニック — 配信内容・タイミング・件名の最適化", category: "分析・改善", description: "サロンのLINE配信の開封率を改善する具体的な方法をデータとともに解説。", brandName: "Lオペ for SALON" });
}
