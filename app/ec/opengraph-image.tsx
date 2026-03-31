import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";

export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";

export default function Image() {
  return generateColumnOGP({
    title: "Lオペ for EC",
    category: "EC・小売向けLINE運用プラットフォーム",
    description: "EC・小売・D2CブランドのLINE公式アカウント運用を効率化するプラットフォーム",
    brandName: "Lオペ for EC",
  });
}
