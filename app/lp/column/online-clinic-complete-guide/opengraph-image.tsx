import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "オンライン診療完全ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "オンライン診療\n完全ガイド",
    category: "ガイド",
    description: "開業準備・システム選定・集患・運用まで徹底解説",
  });
}
