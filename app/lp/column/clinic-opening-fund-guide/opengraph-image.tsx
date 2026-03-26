import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニック開業資金の調達方法 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニック開業資金の\n調達方法ガイド",
    category: "開業・経営",
    description: "自己資金・融資・リースの組み合わせ戦略",
  });
}
