import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "オンライン診療×服薬指導の一気通貫フロー — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "オンライン診療×服薬指導の\n一気通貫フロー",
    category: "ガイド",
    description: "薬剤師連携で患者体験を最適化する方法",
  });
}
