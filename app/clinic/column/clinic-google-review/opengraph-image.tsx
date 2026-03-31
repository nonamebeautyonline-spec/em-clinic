import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのGoogle口コミ対策 — LINE連携で評価を向上させる方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのGoogle口コミ対策 — LINE連携で評価を向上させる方法",
    category: "マーケティング",
    description:
      "LINE公式アカウントを活用した口コミ依頼の自動化・ネガティブレビュー対策・MEO戦略を紹介。",
  });
}
