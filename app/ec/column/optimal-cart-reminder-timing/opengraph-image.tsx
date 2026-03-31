import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "カゴ落ちリマインドの最適タイミング — データで見る回収率が最も高い配信時間", category: "カゴ落ち対策", description: "カゴ落ちリマインドを送るべき最適なタイミングをデータに基づいて解説。", brandName: "Lオペ for EC" });
}
