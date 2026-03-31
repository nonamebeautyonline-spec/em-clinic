import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";
export const runtime = "edge";
export const alt = "自費診療のオンライン診療ルール — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";
export default function OGImage() {
  return generateColumnOGP({ title: "自費診療の\nオンライン診療ルール", category: "ガイド", description: "指針・薬機法・広告規制の要点整理" });
}
