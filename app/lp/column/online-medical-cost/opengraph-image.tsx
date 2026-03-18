import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "オンライン診療の導入費用と運用コスト — 費用を抑える3つのコツ";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "オンライン診療の導入費用と運用コスト — 費用を抑える3つのコツ",
    category: "ガイド",
    description:
      "オンライン診療の導入にかかる初期費用・運用費用を項目別に解説。システム構築・ハードウェア・通信環境・セキュリティ対策の費用目安と、コストを抑える3つの方法を紹介。",
  });
}
