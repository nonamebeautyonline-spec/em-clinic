import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "自費クリニックのカウンセリング成約率を上げる方法 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "カウンセリング\n成約率を上げる方法",
    category: "マーケティング",
    description: "初診から契約につなげる導線設計",
  });
}
