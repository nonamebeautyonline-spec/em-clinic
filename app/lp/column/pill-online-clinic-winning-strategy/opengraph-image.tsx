import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "ピル処方オンラインクリニックの勝ち方 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "ピル処方オンライン\nクリニックの勝ち方",
    category: "活用事例",
    description: "定期処方・継続率・差別化戦略を徹底解説",
  });
}
