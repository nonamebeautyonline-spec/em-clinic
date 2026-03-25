import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "MS法人と医療法人の仕組みと活用法 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "MS法人と医療法人の\n仕組みと活用法",
    category: "経営戦略",
    description: "役割分担・税務上の注意点・失敗パターンと回避策を解説",
  });
}
