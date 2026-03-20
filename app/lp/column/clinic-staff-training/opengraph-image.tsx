import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックスタッフのLINE運用研修ガイド — ITが苦手でも使える教育方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックスタッフのLINE運用研修ガイド — ITが苦手でも使える教育方法",
    category: "ガイド",
    description:
      "ITリテラシーの低いスタッフでもLINE公式アカウントを使いこなせるようになる研修方法を解説。段階的な教育プログラム・マニュアル作成・よくあるつまずきポイントの対策を紹介。",
  });
}
