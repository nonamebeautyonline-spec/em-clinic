import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "脱毛サロンのLINE活用ガイド — 施術間隔管理と友だち紹介キャンペーン", category: "業態別活用事例", description: "脱毛サロンがLINE公式アカウントを活用する方法を解説。施術間隔管理と友だち紹介キャンペーン。", brandName: "Lオペ for SALON" });
}
