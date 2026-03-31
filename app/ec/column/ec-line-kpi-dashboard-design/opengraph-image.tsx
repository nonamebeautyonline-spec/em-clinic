import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "EC×LINE運用のKPI設計 — 追うべき指標とダッシュボードの作り方", category: "分析・改善", description: "EC×LINE運用で追うべきKPIを体系的に整理。意思決定に必要な指標とダッシュボード設計。", brandName: "Lオペ for EC" });
}
