import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの患者コミュニケーション改善 — LINE活用の5つのポイント";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの患者コミュニケーション改善 — LINE活用の5つのポイント",
    category: "ガイド",
    description:
      "タイミング・パーソナライズ・双方向性・一貫性・フォローの5つのポイントで患者満足度と信頼関係を向上。",
  });
}
