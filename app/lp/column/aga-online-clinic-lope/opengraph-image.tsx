import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "AGA治療のオンライン診療ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "AGA治療の\nオンライン診療ガイド",
    category: "活用事例",
    description: "Lオペで予約・処方・フォローを完全自動化",
  });
}
