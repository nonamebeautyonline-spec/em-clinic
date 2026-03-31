import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";

export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";

export default function Image() {
  return generateColumnOGP({
    title: "Lオペ for SALON",
    category: "サロン特化LINE運用プラットフォーム",
    description: "美容室・ネイル・エステ・まつげ・脱毛サロンのLINE公式アカウント運用を効率化",
    brandName: "Lオペ for SALON",
  });
}
