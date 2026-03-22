import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "保険診療の点数削減時代に備える自費診療シフト戦略 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "保険診療の点数削減時代に備える\n自費診療シフト戦略",
    category: "経営戦略",
    description: "診療報酬改定の推移と自費転換の実践ロードマップ",
  });
}
