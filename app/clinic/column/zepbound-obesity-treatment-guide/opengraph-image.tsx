import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "ゼップバウンド完全ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "ゼップバウンド完全ガイド\n保険適用の条件・薬価・処方要件",
    category: "医薬品解説",
    description: "ウゴービとの比較・処方施設の条件まで徹底解説",
  });
}
