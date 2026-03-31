import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの季節別LINE配信戦略 — 花粉症・インフルエンザ・美容の集患術";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの季節別LINE配信戦略 — 花粉症・インフルエンザ・美容の集患術",
    category: "マーケティング",
    description:
      "クリニックの季節ごとのLINE配信戦略を解説。花粉症・インフルエンザ・紫外線対策・年末年始など、季節イベントに合わせたセグメント配信で来院を促進する方法を紹介。",
  });
}
