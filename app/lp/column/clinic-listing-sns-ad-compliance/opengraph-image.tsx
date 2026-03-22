import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "クリニックのリスティング広告・SNS広告と医療広告ガイドライン — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "リスティング広告・SNS広告の\n医療広告ガイドライン対応",
    category: "ガイド",
    description: "Google広告・Instagram・X・TikTok・LINE配信の違反防止実践ガイド",
  });
}
