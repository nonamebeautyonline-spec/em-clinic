import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "美容内服セット処方の組み方 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "美容内服セット処方の\n組み方ガイド",
    category: "ガイド",
    description: "目的別（美白・ニキビ・エイジングケア）の最適な組み合わせ",
  });
}
