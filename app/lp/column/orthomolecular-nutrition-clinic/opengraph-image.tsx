import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "栄養療法・分子栄養学のクリニック導入 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "栄養療法・分子栄養学の\nクリニック導入",
    category: "ガイド",
    description: "サプリ処方・血液検査・自費メニュー化",
  });
}
