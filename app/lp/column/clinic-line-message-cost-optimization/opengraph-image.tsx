import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "LINE公式アカウントの通数課金を最適化 — クリニックの配信コスト削減テクニック";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "LINE公式アカウントの通数課金を最適化 — クリニックの配信コスト削減テクニック",
    category: "業務改善",
    description:
      "料金プラン比較、通数課金の仕組み、セグメント配信によるコスト削減テクニックを解説。",
  });
}
