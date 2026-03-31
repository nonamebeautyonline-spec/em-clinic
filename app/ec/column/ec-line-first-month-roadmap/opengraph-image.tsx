import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "EC×LINE運用開始1ヶ月のロードマップ — 友だち集めから初回売上まで", category: "EC×LINE活用入門", description: "ECサイトでLINE運用を開始した最初の1ヶ月で取り組むべきことをロードマップ形式で解説。", brandName: "Lオペ for EC" });
}
