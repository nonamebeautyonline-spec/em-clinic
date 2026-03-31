import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニック予約システム比較10選 — LINE連携できるツールの選び方";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニック予約システム比較10選 — LINE連携できるツールの選び方",
    category: "比較",
    description:
      "LINE連携に対応したクリニック向け予約システム10選を徹底比較。機能・価格・導入実績の観点から、最適な予約システムの選び方を解説。",
  });
}
