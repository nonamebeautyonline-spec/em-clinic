import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "美容内服のオンライン処方ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "美容内服の\nオンライン処方ガイド",
    category: "活用事例",
    description: "セグメント配信でリピート率を最大化する方法",
  });
}
