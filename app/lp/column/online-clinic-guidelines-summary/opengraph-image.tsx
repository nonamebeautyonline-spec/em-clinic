import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";
export const runtime = "edge";
export const alt = "オンライン診療の適切な実施に関する指針 — 重要ポイント完全解説";
export const size = ogpSize;
export const contentType = "image/png";
export default function OGImage() {
  return generateColumnOGP({ title: "オンライン診療の適切な\n実施に関する指針", category: "ガイド", description: "重要ポイント完全解説" });
}
