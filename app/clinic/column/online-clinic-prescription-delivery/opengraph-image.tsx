import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";
export const runtime = "edge";
export const alt = "オンライン診療の医薬品配送ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";
export default function OGImage() {
  return generateColumnOGP({ title: "オンライン診療の\n医薬品配送ガイド", category: "ガイド", description: "法規制・配送方法・梱包・追跡の実務ノウハウ" });
}
