import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのLINE配信で患者に嫌われない — ブロック率を下げる5つの鉄則";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "クリニックのLINE配信で患者に嫌われない — ブロック率を下げる5つの鉄則",
    category: "マーケティング",
    description:
      "LINE公式アカウントのブロック率を下げるための5つの鉄則を解説。配信頻度・内容・タイミングの最適化で、患者との長期的な関係を構築する方法を紹介。",
  });
}
