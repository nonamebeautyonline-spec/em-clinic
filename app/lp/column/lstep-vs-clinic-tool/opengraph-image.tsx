import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "Lステップ・Liny vs クリニック専用ツール — LINE配信ツール徹底比較";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "Lステップ・Liny vs クリニック専用ツール — LINE配信ツール徹底比較",
    category: "ツール比較",
    description:
      "Lステップ・Linyなどの汎用LINE配信ツールとクリニック専用ツールの違いを徹底比較。機能・費用・運用負荷の観点から、クリニックに最適なツール選びを解説。",
  });
}
