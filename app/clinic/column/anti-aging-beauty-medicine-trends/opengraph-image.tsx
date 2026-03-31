import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "アンチエイジング内服薬の最新トレンド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "アンチエイジング内服薬\nの最新トレンド",
    category: "ガイド",
    description: "NMN・グルタチオン・高濃度ビタミンC・プラセンタ・CoQ10を徹底比較",
  });
}
