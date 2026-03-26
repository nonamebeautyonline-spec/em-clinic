import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "メンタルヘルスのオンライン診療 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "メンタルヘルスの\nオンライン診療",
    category: "ガイド",
    description: "不眠症・軽度うつの初診対応と処方設計",
  });
}
