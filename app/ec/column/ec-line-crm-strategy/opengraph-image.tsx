import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "D2CブランドのLINE CRM戦略 — 購買データ×LINEで顧客LTVを最大化", category: "顧客管理・CRM", description: "D2CブランドがLINE×CRMで顧客LTVを最大化する戦略を解説。", brandName: "Lオペ for EC" });
}
