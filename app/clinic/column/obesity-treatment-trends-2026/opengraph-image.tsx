import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "肥満症治療の最新動向 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "肥満症治療の最新動向\nウゴービ保険適用とGLP-1",
    category: "ガイド",
    description: "保険適用と自費処方の使い分けガイド",
  });
}
