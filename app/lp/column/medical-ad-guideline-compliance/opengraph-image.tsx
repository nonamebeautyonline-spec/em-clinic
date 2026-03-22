import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "医療広告ガイドライン遵守ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "医療広告ガイドライン\n遵守ガイド",
    category: "ガイド",
    description: "違反例・OK表現・セルフチェックリスト",
  });
}
