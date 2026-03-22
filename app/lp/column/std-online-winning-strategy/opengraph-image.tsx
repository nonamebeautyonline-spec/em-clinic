import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "性感染症オンライン診療の勝ち方 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "性感染症オンライン診療の\n勝ち方",
    category: "経営戦略",
    description: "検査キットモデル・プライバシー戦略で月商200万超",
  });
}
