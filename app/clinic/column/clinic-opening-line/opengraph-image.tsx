import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニック開業時のLINE公式アカウント活用 — 開業前から始める集患戦略";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニック開業時のLINE公式アカウント活用 — 開業前から始める集患戦略",
    category: "ガイド",
    description:
      "クリニック開業前からLINE公式アカウントを活用して集患する方法を解説。開業準備期間中のLINE構築から初月の友だち獲得までのロードマップを紹介。",
  });
}
