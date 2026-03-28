import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "マンジャロとは？効果・仕組み・用量の選び方 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "マンジャロとは？\n効果・仕組み・用量の選び方",
    category: "医薬品解説",
    description: "GIP/GLP-1デュアル作動薬の基本と勘違い12選",
  });
}
