import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "花粉症オンライン診療の勝ち方 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "花粉症オンライン診療の\n勝ち方",
    category: "経営戦略",
    description: "季節性需要の取り込みと定期処方戦略",
  });
}
