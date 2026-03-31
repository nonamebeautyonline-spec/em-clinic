import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "サロン業態別リッチメニューテンプレート — 美容室・ネイル・エステ・脱毛", category: "リッチメニュー・UI設計", description: "美容室・ネイルサロン・エステ・まつげサロン・脱毛サロン向けのリッチメニューテンプレートを紹介。", brandName: "Lオペ for SALON" });
}
