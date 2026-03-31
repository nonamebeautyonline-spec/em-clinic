import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのNPS調査導入ガイド — LINE配信で患者満足度を可視化する方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのNPS調査導入ガイド — LINE配信で患者満足度を可視化する方法",
    category: "ガイド",
    description:
      "クリニックにNPS（Net Promoter Score）調査を導入する方法を解説。LINE公式アカウントを活用した自動配信・スコア分析・改善アクションの立て方まで、患者満足度の可視化を紹介。",
  });
}
