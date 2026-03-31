import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロンの休眠顧客をLINEで掘り起こす — 再来店を促す5つの施策", category: "配信・リピート促進", description: "一定期間来店がないサロンの休眠顧客をLINEで掘り起こす5つの施策を解説。", brandName: "Lオペ for SALON" });
}
