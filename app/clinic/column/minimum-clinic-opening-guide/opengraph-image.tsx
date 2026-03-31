import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "ミニマム開業完全ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "ミニマム開業\n完全ガイド",
    category: "ガイド",
    description: "ワンルーム×Dr1人×DXで月200〜300万円の追加所得を実現",
  });
}
