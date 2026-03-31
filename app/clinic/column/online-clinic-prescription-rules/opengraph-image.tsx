import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";
export const runtime = "edge";
export const alt = "オンライン診療で処方できる薬・できない薬 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";
export default function OGImage() {
  return generateColumnOGP({ title: "オンライン診療で\n処方できる薬・できない薬", category: "ガイド", description: "薬剤別の処方制限を完全ガイド" });
}
