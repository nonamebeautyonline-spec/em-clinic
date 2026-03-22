import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "自費クリニックの売上を3倍にするマーケティング戦略 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "自費クリニックの売上を\n3倍にするマーケティング戦略",
    category: "マーケティング",
    description: "集患・単価UP・リピートの3軸で成長",
  });
}
