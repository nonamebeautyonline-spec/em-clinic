import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの人件費最適化 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの\n人件費最適化ガイド",
    category: "経営戦略",
    description: "非常勤・スポット医師・タスクシフトの活用法",
  });
}
