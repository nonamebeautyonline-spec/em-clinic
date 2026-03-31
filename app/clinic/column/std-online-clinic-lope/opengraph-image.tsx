import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "性感染症のオンライン診療ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "性感染症の\nオンライン診療ガイド",
    category: "活用事例",
    description: "プライバシー配慮とLINE活用で患者体験を最適化",
  });
}
