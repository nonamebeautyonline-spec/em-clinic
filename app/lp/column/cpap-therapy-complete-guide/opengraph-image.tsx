import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "CPAP療法完全ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "CPAP療法完全ガイド\n費用・効果・オンライン管理",
    category: "ガイド",
    description: "仕組み・機器比較・マスク選び・費用・遵守率対策まで網羅",
  });
}
