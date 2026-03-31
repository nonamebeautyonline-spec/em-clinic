import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンのLINE運用開始1ヶ月ロードマップ — 友だち集めから初回配信まで", category: "サロンLINE活用入門", description: "サロンがLINE公式アカウントの運用を始めた最初の1ヶ月で取り組むべきことをロードマップ形式で解説。", brandName: "Lオペ for SALON" });
}
