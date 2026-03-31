import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINE×CRMで顧客維持率を高める方法 — リピーター育成の成功パターン", category: "成功事例・ノウハウ", description: "LINE公式アカウントをCRMとして活用し顧客維持率を向上させる方法を解説。顧客ライフサイクルに合わせた配信設計と成功事例を紹介。", brandName: "Lオペ" });
}
