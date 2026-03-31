import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "オンライン診療のシステム利用料の設計 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "オンライン診療の\nシステム利用料の設計",
    category: "経営戦略",
    description: "適正価格と患者離脱を防ぐ料金体系",
  });
}
