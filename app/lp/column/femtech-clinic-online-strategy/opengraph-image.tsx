import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "フェムテック市場とクリニックの参入戦略 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "フェムテック市場と\nクリニックの参入戦略",
    category: "経営戦略",
    description: "月経・更年期・妊活領域のオンライン診療",
  });
}
