import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "花粉症のオンライン診療ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "花粉症の\nオンライン診療ガイド",
    category: "活用事例",
    description: "季節配信で患者を逃さないLINE活用戦略",
  });
}
