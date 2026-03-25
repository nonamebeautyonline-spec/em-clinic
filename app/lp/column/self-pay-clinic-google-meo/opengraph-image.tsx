import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "自費クリニックのGoogle口コミ・MEO対策 — 地域検索で上位表示を獲る方法";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "自費クリニックのGoogle口コミ・MEO対策 — 地域検索で上位表示を獲る方法",
    category: "マーケティング",
    description:
      "Googleビジネスプロフィールの最適化、口コミ獲得戦略、LINE連携テンプレート活用、ネガティブ口コミ対応、ローカルSEO連携を解説。",
  });
}
