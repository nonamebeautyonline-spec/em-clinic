import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "LINE活用でリピート率30%向上を達成した5つのサロン事例", category: "成功事例・売上UP", description: "LINE公式アカウントを活用してリピート率や売上を大幅に伸ばした5つのサロン事例を紹介。", brandName: "Lオペ for SALON" });
}
