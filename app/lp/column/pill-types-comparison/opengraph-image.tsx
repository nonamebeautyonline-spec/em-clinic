import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "低用量ピルの種類と選び方 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "低用量ピルの種類と\n選び方ガイド",
    category: "ガイド",
    description: "マーベロン・トリキュラー・ファボワール・ヤーズを徹底比較",
  });
}
