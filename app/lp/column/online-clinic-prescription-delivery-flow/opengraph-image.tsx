import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "オンライン診療の処方箋と薬の受け取りフロー — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "オンライン診療の\n処方箋と薬の受け取りフロー",
    category: "ガイド",
    description: "院外処方・院内処方・配送の選び方",
  });
}
