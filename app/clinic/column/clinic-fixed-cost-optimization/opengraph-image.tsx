import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt =
  "クリニックの家賃・固定費最適化ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックの家賃・\n固定費最適化ガイド",
    category: "業務改善",
    description: "立地選びからコスト管理まで経営を安定させる方法",
  });
}
