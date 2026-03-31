import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "配達完了後のLINEレビュー依頼 — 回答率を高めるタイミングとメッセージ設計", category: "発送管理・物流", description: "配達完了後にLINEでレビュー依頼を送る最適なタイミングとメッセージ設計を解説。", brandName: "Lオペ for EC" });
}
