import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのLINE公式アカウント導入ROI — 費用対効果の計算方法と事例";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのLINE公式アカウント導入ROI — 費用対効果の計算方法と事例",
    category: "ガイド",
    description:
      "クリニックがLINE公式アカウントを導入した際のROI（投資対効果）の計算方法を解説。導入コスト・削減される業務時間・増加する売上を定量的に算出し、投資判断をサポート。",
  });
}
