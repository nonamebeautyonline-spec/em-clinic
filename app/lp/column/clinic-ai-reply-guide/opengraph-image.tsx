import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのAI返信活用ガイド — 問い合わせ対応を自動化して新患獲得を最大化";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのAI返信活用ガイド — 問い合わせ対応を自動化して新患獲得を最大化",
    category: "ガイド",
    description:
      "AI自動学習型の返信の仕組みから導入手順、学習データの蓄積方法、精度向上のコツまでを解説。",
  });
}
