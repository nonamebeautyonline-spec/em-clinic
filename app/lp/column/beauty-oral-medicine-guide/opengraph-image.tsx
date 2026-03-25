import { generateColumnOGP, ogpSize } from "../_components/ogp-helper";

export const runtime = "edge";
export const alt = "美容内服薬の種類と効果ガイド — Lオペ for CLINIC コラム";
export const size = ogpSize;
export const contentType = "image/png";

export default function OGImage() {
  return generateColumnOGP({
    title: "美容内服薬の種類と\n効果ガイド",
    category: "ガイド",
    description: "トラネキサム酸・シナール・ユベラ・ハイチオール・タチオン・ビタメジンを徹底解説",
  });
}
