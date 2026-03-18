import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのAI自動返信導入ガイド — 24時間対応で新患獲得を最大化";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニックのAI自動返信導入ガイド — 24時間対応で新患獲得を最大化",
    category: "ガイド",
    description:
      "クリニックのLINE公式アカウントにAI自動返信を導入する方法を解説。24時間の問い合わせ対応で新患獲得機会を逃さず、スタッフの負担も削減する運用方法を紹介。",
  });
}
