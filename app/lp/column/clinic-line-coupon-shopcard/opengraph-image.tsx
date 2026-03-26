import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックのLINEクーポン・ショップカード活用術 — 自費メニューの再来院率を上げる施策";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックのLINEクーポン・ショップカード活用術 — 自費メニューの再来院率を上げる施策",
    category: "マーケティング",
    description:
      "LINEクーポンとショップカードを活用してクリニックの再来院率を高める方法を解説。自費メニューの初回限定・紹介特典・季節限定クーポンの設計と配信タイミングの最適化を紹介。",
  });
}
