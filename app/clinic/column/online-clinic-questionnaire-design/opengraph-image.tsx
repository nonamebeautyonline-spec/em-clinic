import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";
export const runtime = "edge";
export const alt = "オンライン診療の問診設計ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";
export default function OGImage() {
  return generateColumnOGP({ title: "オンライン診療の\n問診設計ガイド", category: "ガイド", description: "診療科別テンプレートと効率化のポイント" });
}
