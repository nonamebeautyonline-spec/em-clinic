import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのDXはLINEから始める — 紙カルテ・電話予約からの脱却ガイド", category: "サロンLINE活用入門", description: "紙のカルテ・電話予約・紙のポイントカードからLINEを活用したデジタル化への移行方法を解説。", brandName: "Lオペ for SALON" });
}
