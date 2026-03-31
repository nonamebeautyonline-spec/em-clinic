import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "高血圧のオンライン診療ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "高血圧の\nオンライン診療ガイド",
    category: "活用事例",
    description: "継続処方・生活指導・モニタリングの運用設計",
  });
}
