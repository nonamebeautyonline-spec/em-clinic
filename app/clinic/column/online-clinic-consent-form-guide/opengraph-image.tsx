import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "オンライン診療の同意書・契約書の整備 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "オンライン診療の同意書・\n契約書の整備ガイド",
    category: "ガイド",
    description: "法的リスクを防ぐ書面設計と電子署名対応",
  });
}
