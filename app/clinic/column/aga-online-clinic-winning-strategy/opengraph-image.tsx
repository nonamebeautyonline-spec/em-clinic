import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "AGA治療オンラインクリニックの勝ち方 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "AGA治療オンラインクリニック\nの勝ち方",
    category: "活用事例",
    description: "差別化戦略・診療ノウハウ・価格設定・収益モデル",
  });
}
