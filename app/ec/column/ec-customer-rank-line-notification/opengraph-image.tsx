import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "EC顧客ランク制度の設計とLINE連携 — ランクアップ通知で購買頻度を高める", category: "顧客管理・CRM", description: "購買金額に応じた顧客ランク制度とLINEランクアップ通知の設計方法。", brandName: "Lオペ for EC" });
}
