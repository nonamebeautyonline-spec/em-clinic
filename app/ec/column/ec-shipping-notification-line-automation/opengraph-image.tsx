import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "ECの発送通知をLINEで自動化する方法 — 注文確認から配達完了まで", category: "発送管理・物流", description: "ECサイトの注文確認・発送完了・配達完了の通知をLINEで自動化する方法を解説。", brandName: "Lオペ for EC" });
}
