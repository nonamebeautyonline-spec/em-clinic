import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "自費クリニックのLTV最大化戦略 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "自費クリニックの\nLTV最大化戦略",
    category: "経営戦略",
    description: "リピート率・継続率を高める5つの施策",
  });
}
