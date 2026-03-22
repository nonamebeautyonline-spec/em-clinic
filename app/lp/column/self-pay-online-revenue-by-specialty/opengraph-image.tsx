import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "自費オンライン診療の診療科別収益モデル — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "自費オンライン診療の\n診療科別収益モデル",
    category: "収益モデル",
    description: "8分野の単価・LTV・継続率を徹底比較",
  });
}
