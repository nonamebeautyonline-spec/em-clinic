import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "ED治療オンラインクリニックの勝ち方 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "ED治療オンラインクリニック\nの勝ち方",
    category: "運営ノウハウ",
    description: "運営ノウハウ・処方戦略・集患術",
  });
}
