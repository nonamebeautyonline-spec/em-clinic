import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "次世代肥満症薬まとめ — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "次世代肥満症薬まとめ\nレタトルチド・アミクレチン・経口薬",
    category: "医薬品解説",
    description: "2026年最新エビデンスで5剤を横断比較",
  });
}
