import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "美容室のLINE運用完全ガイド — スタイリスト指名予約からリピート促進まで", category: "業態別活用事例", description: "美容室がLINE公式アカウントを活用する方法を完全解説。スタイリスト指名予約からリピート促進まで。", brandName: "Lオペ for SALON" });
}
