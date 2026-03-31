import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";

export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";

export default function Image() {
  return generateColumnOGP({
    title: "Lオペ for LINE",
    category: "LINE運用プラットフォーム",
    description: "LINE公式アカウントの配信・セグメント・リッチメニュー・予約・フォーム・分析をオールインワンで管理",
    brandName: "Lオペ for LINE",
  });
}
