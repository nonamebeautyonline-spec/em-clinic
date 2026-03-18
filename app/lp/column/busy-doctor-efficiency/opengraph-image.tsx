import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "開業医が忙しい理由と業務効率化の方法 — DXで診療に集中する";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "開業医が忙しい理由と業務効率化の方法 — DXで診療に集中する",
    category: "業務改善",
    description:
      "開業医の1日のスケジュールから忙しさの原因を分析。経営業務との兼務・DX対応・急患対応の3大要因と、LINE・電子カルテ・予約システムによる効率化方法を解説。",
  });
}
