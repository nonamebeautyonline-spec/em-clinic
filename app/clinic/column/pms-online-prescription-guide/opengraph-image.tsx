import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "PMS・月経困難症のオンライン処方ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "PMS・月経困難症の\nオンライン処方ガイド",
    category: "ガイド",
    description: "ピル・漢方の使い分けと継続処方の設計",
  });
}
