import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "エステサロンのLINE活用戦略 — コースフォローから物販まで売上を最大化", category: "業態別活用事例", description: "エステサロンがLINE公式アカウントを活用して売上を伸ばす戦略を解説。", brandName: "Lオペ for SALON" });
}
