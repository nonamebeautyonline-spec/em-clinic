import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの保険選び — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの保険選び\n徹底比較ガイド",
    category: "ガイド",
    description: "医師賠償責任保険・休業補償・サイバー保険の比較",
  });
}
