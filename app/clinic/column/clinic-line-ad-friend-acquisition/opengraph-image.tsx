import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "LINE友だち追加広告（LAP）の運用ガイド — クリニックの費用対効果を最大化する出稿戦略";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title:
      "LINE友だち追加広告（LAP）の運用ガイド — クリニックの費用対効果を最大化する出稿戦略",
    category: "マーケティング",
    description:
      "友だち追加広告の仕組み、ターゲティング設定、CPA目安、クリエイティブ作成、導線設計を解説。",
  });
}
