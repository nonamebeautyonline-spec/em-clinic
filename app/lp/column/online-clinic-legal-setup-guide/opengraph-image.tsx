import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";
export const runtime = "edge";
export const alt = "オンライン診療クリニックの開設届・法的手続きガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";
export default function OGImage() {
  return generateColumnOGP({ title: "オンライン診療クリニックの\n開設届・法的手続きガイド", category: "ガイド", description: "届出から診療開始まで完全解説" });
}
