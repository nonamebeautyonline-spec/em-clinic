import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "マンジャロの副作用と対処法 — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "マンジャロの副作用と対処法\n便秘・吐き気・抜け毛の原因",
    category: "医薬品解説",
    description: "下剤の選び方から受診タイミングまで解説",
  });
}
