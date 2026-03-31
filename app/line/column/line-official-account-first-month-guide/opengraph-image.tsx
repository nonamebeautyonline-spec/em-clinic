import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({
    title: "LINE公式アカウント運用開始1ヶ月でやること — 友だち集めから初回配信まで",
    category: "LINE公式アカウント入門",
    description: "LINE公式アカウントの運用を始めた最初の1ヶ月で取り組むべきことをロードマップ形式で解説。友だち集め、初回配信、効果測定まで、成果を出すための最初の一歩を紹介します。",
    brandName: "Lオペ for LINE",
  });
}
