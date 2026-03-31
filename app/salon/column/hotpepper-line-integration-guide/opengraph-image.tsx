import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "ホットペッパーとLINE連携で予約率向上 — 一元管理の実現方法", category: "予約管理・ホットペッパー連携", description: "ホットペッパービューティーとLINE公式アカウントを連携させて予約を一元管理する方法を解説。", brandName: "Lオペ for SALON" });
}
