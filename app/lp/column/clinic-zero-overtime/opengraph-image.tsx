import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "クリニックスタッフの残業をゼロにする — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "クリニックスタッフの\n残業をゼロにする",
    category: "業務改善",
    description: "DXで実現する働き方改革と人材定着",
  });
}
