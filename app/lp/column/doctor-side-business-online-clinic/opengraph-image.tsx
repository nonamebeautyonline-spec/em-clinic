import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "勤務医のオンライン副業開業ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "勤務医のオンライン\n副業開業ガイド",
    category: "開業・経営",
    description: "本業を続けながら月200〜300万円の副収入を実現",
  });
}
