import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの相続・事業承継 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの相続・\n事業承継ガイド",
    category: "経営戦略",
    description: "個人開業と医療法人で異なる承継プランニング",
  });
}
