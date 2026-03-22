import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";
export const runtime = "edge";
export const alt = "オンライン診療の法規制と薬機法 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";
export default function OGImage() {
  return generateColumnOGP({ title: "オンライン診療の\n法規制と薬機法", category: "ガイド", description: "クリニックが知るべき最新ルールと注意点" });
}
