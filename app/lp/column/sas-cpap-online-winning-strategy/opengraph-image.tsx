import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "いびき・SAS治療オンラインクリニックの勝ち方 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "いびき・SAS治療\nオンラインクリニックの勝ち方",
    category: "活用事例",
    description: "CPAP管理とLINEフォローで安定収益",
  });
}
