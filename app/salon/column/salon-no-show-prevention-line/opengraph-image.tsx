import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンの無断キャンセルをLINEリマインドで防ぐ — 来店率を95%に上げる方法", category: "予約管理・ホットペッパー連携", description: "サロンの無断キャンセル（ノーショー）をLINEの自動リマインド配信で防止する方法を解説。", brandName: "Lオペ for SALON" });
}
