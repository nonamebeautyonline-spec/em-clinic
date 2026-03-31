import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのLINE公式アカウント運用完全ガイド｜友だち集めから配信・自動化まで";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニックのLINE公式アカウント運用完全ガイド｜友だち集めから配信・自動化まで",
    category: "ガイド",
    description:
      "LINE公式アカウントの基本設定から友だち集め・セグメント配信・リッチメニュー・AI自動返信・ブロック率対策まで、クリニックのLINE運用を体系的に解説する完全ガイド。",
  });
}
