import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "個人医師の自費クリニック開業完全ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "個人医師の自費クリニック\n開業完全ガイド",
    category: "開業・経営",
    description: "法人化・資金計画・物件選び・集患・DX活用まで網羅",
  });
}
