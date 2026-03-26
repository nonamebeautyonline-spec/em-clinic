import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "GLP-1受容体作動薬の種類比較 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "GLP-1受容体作動薬の\n種類比較ガイド",
    category: "ガイド",
    description: "リベルサス・オゼンピック・マンジャロの効果・費用・副作用",
  });
}
