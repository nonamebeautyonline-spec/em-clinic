import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";
export const runtime = "edge";
export const alt = "電子処方箋の導入ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";
export default function OGImage() {
  return generateColumnOGP({ title: "電子処方箋の\n導入ガイド", category: "ガイド", description: "対応手順と運用フローを解説" });
}
