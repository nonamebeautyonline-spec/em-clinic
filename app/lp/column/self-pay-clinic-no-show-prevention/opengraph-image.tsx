import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "自費クリニックの予約キャンセル・無断キャンセル対策 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "予約キャンセル・\n無断キャンセル対策",
    category: "業務改善",
    description: "来院率を95%以上にする方法",
  });
}
