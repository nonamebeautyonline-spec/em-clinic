import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのLINEタグ管理・セグメント設計 — 属性別配信で反応率を最大化する方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのLINEタグ管理・セグメント設計 — 属性別配信で反応率を最大化する方法",
    category: "ガイド",
    description:
      "クリニックのLINE運用に最適なタグ設計とセグメント配信の実践方法を解説。診療科・施術歴・来院頻度別のタグ運用ルールと自動付与の仕組みを紹介。",
  });
}
