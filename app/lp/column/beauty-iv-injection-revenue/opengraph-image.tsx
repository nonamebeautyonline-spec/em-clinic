import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "美容点滴・注射メニューの収益設計 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "美容点滴・注射の\n収益設計",
    category: "経営戦略",
    description: "白玉点滴・プラセンタ・高濃度ビタミンCの原価と価格設定",
  });
}
