import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "イソトレチノイン（アキュテイン）完全ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "イソトレチノイン\n完全ガイド\n— 重症ニキビ治療",
    category: "医薬品解説",
    description: "効果・必要な検査・催奇形性リスク・副作用を徹底解説",
  });
}
