import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのLINE友だち0→1000人を達成するロードマップ — 立ち上げ期の成長戦略", category: "成功事例・売上UP", description: "サロンのLINE公式アカウントの友だち数を0人から1000人まで増やすためのロードマップを解説。", brandName: "Lオペ for SALON" });
}
