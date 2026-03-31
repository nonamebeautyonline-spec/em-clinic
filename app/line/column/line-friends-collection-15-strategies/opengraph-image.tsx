import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINE友だち集め施策15選 — オンラインからオフラインまで集客手法を網羅", category: "分析・改善", description: "LINE公式アカウントの友だち数を効率的に増やす15の施策を紹介。SNS連携・Web導線・店頭POP・広告活用など集客手法を網羅的に解説。", brandName: "Lオペ" });
}
