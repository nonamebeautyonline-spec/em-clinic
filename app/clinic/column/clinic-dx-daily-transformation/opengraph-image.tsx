import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "クリニックDXで1日の業務がここまで変わる — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックDXで\n1日の業務がここまで変わる",
    category: "業務改善",
    description: "導入前後のタイムラインで見る劇的変化",
  });
}
