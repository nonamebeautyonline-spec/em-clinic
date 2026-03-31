import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "自費クリニックのリピート処方で安定収益を作る方法 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "リピート処方で\n安定収益を作る方法",
    category: "経営戦略",
    description: "定期配送・自動フォローの仕組み化",
  });
}
