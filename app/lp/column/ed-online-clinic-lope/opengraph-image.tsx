import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "ED治療のオンライン診療ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "ED治療の\nオンライン診療ガイド",
    category: "活用事例",
    description: "匿名性とLINE予約で患者獲得を最大化",
  });
}
