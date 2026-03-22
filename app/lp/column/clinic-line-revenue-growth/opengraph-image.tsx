import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "クリニックの売上を上げるLINE活用術 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの売上を上げる\nLINE活用術",
    category: "マーケティング",
    description: "再診率・自費率・新患獲得の3軸で収益改善",
  });
}
