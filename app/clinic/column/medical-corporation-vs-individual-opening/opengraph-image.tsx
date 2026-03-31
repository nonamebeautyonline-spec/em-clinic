import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "医療法人と個人開業の徹底比較 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "医療法人と個人開業の\n徹底比較",
    category: "開業・経営",
    description: "設立要件・税務・資金調達・分院展開・法人化タイミングまで網羅",
  });
}
