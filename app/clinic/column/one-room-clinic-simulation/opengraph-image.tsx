import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "ワンルーム開業の収支シミュレーション — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "ワンルーム開業の\n収支シミュレーション",
    category: "ガイド",
    description: "月10万円のマンションで月収200万円超を実現",
  });
}
