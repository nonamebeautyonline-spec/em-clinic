import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "美容内服オンラインクリニックの勝ち方 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "美容内服オンライン\nクリニックの勝ち方",
    category: "開業・経営",
    description: "美白・ニキビ・エイジングケア処方戦略",
  });
}
