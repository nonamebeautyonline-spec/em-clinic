import { generateColumnOGP } from "@/lib/column-shared/ogp-helper";
export { ogpSize as size } from "@/lib/column-shared/ogp-helper";
export const contentType = "image/png";
export default function Image() {
  return generateColumnOGP({ title: "不動産業界のLINE活用術 — 内見予約から成約率アップまで", category: "業種別活用事例", description: "不動産会社がLINE公式アカウントを活用して成約率を向上させる方法を解説。物件情報配信・内見予約・追客シナリオなど不動産特有の施策を紹介。", brandName: "Lオペ for LINE" });
}
