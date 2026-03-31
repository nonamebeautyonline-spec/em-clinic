import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "ピル処方のオンライン診療ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "ピル処方の\nオンライン診療ガイド",
    category: "活用事例",
    description: "定期配送とリマインド自動化で安定収益を構築",
  });
}
