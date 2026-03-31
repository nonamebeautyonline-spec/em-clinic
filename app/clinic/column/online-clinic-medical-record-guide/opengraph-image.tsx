import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "オンライン診療のカルテ記載と診療録管理 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "オンライン診療の\nカルテ記載と診療録管理",
    category: "ガイド",
    description: "対面診療との記載要件の違いと運用ノウハウ",
  });
}
