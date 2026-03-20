import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの患者LTV向上戦略 — LINEで生涯価値を最大化する方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの患者LTV向上戦略 — LINEで生涯価値を最大化する方法",
    category: "マーケティング",
    description:
      "クリニック経営における患者LTV（顧客生涯価値）の考え方と向上戦略を解説。LINE公式アカウントを活用したリピート促進・クロスセル・長期フォローの具体策を紹介。",
  });
}
