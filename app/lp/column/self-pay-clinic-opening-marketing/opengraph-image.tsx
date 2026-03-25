import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "自費クリニック開業時のマーケティング計画 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "開業時の\nマーケティング計画",
    category: "開業・経営",
    description: "開院前6ヶ月から始める集患準備",
  });
}
