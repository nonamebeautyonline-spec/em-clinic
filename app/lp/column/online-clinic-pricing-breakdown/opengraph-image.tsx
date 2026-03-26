import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "オンライン診療の料金相場と費用内訳 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "オンライン診療の\n料金相場と費用内訳",
    category: "ガイド",
    description: "保険診療・自費診療別の費用設計ガイド",
  });
}
