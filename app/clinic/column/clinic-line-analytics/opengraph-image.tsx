import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのLINE配信効果測定 — 開封率・CV率の分析方法と改善策";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのLINE配信効果測定 — 開封率・CV率の分析方法と改善策",
    category: "マーケティング",
    description:
      "クリニックのLINE配信の効果測定方法を解説。開封率・クリック率・予約CV率の計測から、ABテストによる改善、ROI算出まで、データドリブンなLINE運用の実践方法を紹介。",
  });
}
