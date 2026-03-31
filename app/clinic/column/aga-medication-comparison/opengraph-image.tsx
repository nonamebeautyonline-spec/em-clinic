import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "AGA治療薬の種類と効果比較 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "AGA治療薬の種類と\n効果比較ガイド",
    category: "ガイド",
    description: "フィナステリド・デュタステリド・ミノキシジルを徹底比較",
  });
}
