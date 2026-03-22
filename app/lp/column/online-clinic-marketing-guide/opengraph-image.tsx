import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "オンライン診療の集患・マーケティング完全ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "オンライン診療の\n集患・マーケティング\n完全ガイド",
    category: "マーケティング",
    description: "SEO・広告・SNS・LINE・MEOのチャネル別戦略を網羅",
  });
}
