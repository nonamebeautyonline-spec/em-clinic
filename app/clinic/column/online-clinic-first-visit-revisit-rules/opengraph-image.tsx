import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "オンライン診療の初診と再診の違い — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "オンライン診療の\n初診と再診の違い",
    category: "ガイド",
    description: "指針上の制限・算定要件・運用の注意点",
  });
}
