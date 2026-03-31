import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "EC×LINE運用のROI測定方法 — LINE経由売上の正しい計測と可視化", category: "分析・改善", description: "LINE経由のEC売上を正確に計測する方法。施策別ROIの算出と投資対効果の可視化。", brandName: "Lオペ for EC" });
}
