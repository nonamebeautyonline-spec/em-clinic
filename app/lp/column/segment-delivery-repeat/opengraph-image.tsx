import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "LINEセグメント配信でクリニックのリピート率を向上させる方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "LINEセグメント配信でクリニックのリピート率を向上させる方法",
    category: "マーケティング",
    description:
      "LINE公式アカウントのセグメント配信を活用して、クリニックの再診率・リピート率を向上させる具体的な方法を解説。配信シナリオやセグメント設計のノウハウを紹介。",
  });
}
