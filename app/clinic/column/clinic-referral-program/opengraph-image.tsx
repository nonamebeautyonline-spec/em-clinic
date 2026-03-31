import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの紹介制度をLINEで仕組み化 — 口コミ集患を自動化する方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの紹介制度をLINEで仕組み化 — 口コミ集患を自動化する方法",
    category: "マーケティング",
    description:
      "クリニックの患者紹介制度をLINE公式アカウントで仕組み化する方法を解説。紹介カードのデジタル化・特典の自動付与・紹介元の追跡管理など、口コミ集患を自動化する具体策を紹介。",
  });
}
