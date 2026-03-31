import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "美容内服の定期処方で安定収益を作る方法 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "美容内服の定期処方で\n安定収益を作る方法",
    category: "経営戦略",
    description: "サブスクモデル×LINEで継続率90%を実現",
  });
}
