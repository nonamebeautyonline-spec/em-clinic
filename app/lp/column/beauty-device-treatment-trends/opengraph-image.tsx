import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "美容医療の施術トレンドとクリニック導入判断 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "美容医療の施術トレンドと\nクリニック導入判断",
    category: "ガイド",
    description: "HIFU・ピコレーザー・RF治療の選定基準",
  });
}
